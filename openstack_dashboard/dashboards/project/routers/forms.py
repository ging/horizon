# Copyright 2012,  Nachi Ueno,  NTT MCL,  Inc.
# All rights reserved.

# Licensed under the Apache License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.

"""
Views for managing Neutron Routers.
"""
import logging

from django.core.urlresolvers import reverse
from django.core.urlresolvers import reverse_lazy
from django.utils.translation import ugettext_lazy as _

from horizon import exceptions
from horizon import forms
from horizon import messages

from openstack_dashboard import api

LOG = logging.getLogger(__name__)


class CreateForm(forms.SelfHandlingForm):
    name = forms.CharField(max_length=255, label=_("Router Name"))
    mode = forms.ChoiceField(label=_("Router Type"))
    ha = forms.ChoiceField(label=_("High Availability Mode"))
    failure_url = 'horizon:project:routers:index'

    def __init__(self, request, *args, **kwargs):
        super(CreateForm, self).__init__(request, *args, **kwargs)
        self.dvr_allowed = api.neutron.get_feature_permission(self.request,
                                                              "dvr", "create")
        if self.dvr_allowed:
            mode_choices = [('server_default', _('Use Server Default')),
                            ('centralized', _('Centralized')),
                            ('distributed', _('Distributed'))]
            self.fields['mode'].choices = mode_choices
        else:
            del self.fields['mode']

        self.ha_allowed = api.neutron.get_feature_permission(self.request,
                                                             "l3-ha", "create")
        if self.ha_allowed:
            ha_choices = [('server_default', _('Use Server Default')),
                          ('enabled', _('Enable HA mode')),
                          ('disabled', _('Disable HA mode'))]
            self.fields['ha'].choices = ha_choices
        else:
            del self.fields['ha']

    def handle(self, request, data):
        try:
            params = {'name': data['name']}
            if (self.dvr_allowed and data['mode'] != 'server_default'):
                params['distributed'] = (data['mode'] == 'distributed')
            if (self.ha_allowed and data['ha'] != 'server_default'):
                params['ha'] = (data['ha'] == 'enabled')
            router = api.neutron.router_create(request, **params)
            message = _('Router %s was successfully created.') % data['name']
            messages.success(request, message)
            return router
        except Exception as exc:
            if exc.status_code == 409:
                msg = _('Quota exceeded for resource router.')
            else:
                msg = _('Failed to create router "%s".') % data['name']
            LOG.info(msg)
            redirect = reverse(self.failure_url)
            exceptions.handle(request, msg, redirect=redirect)
            return False


class UpdateForm(forms.SelfHandlingForm):
    name = forms.CharField(label=_("Name"), required=False)
    # TODO(amotoki): make UP/DOWN translatable
    admin_state = forms.ChoiceField(choices=[(True, 'UP'), (False, 'DOWN')],
                                    label=_("Admin State"))
    router_id = forms.CharField(label=_("ID"),
                                widget=forms.HiddenInput())
    mode = forms.ChoiceField(label=_("Router Type"))
    ha = forms.BooleanField(label=_("High Availability Mode"), required=False)

    redirect_url = reverse_lazy('horizon:project:routers:index')

    def __init__(self, request, *args, **kwargs):
        super(UpdateForm, self).__init__(request, *args, **kwargs)
        self.dvr_allowed = api.neutron.get_feature_permission(self.request,
                                                              "dvr", "update")
        if not self.dvr_allowed:
            del self.fields['mode']
        elif kwargs.get('initial', {}).get('mode') == 'distributed':
            # Neutron supports only changing from centralized to
            # distributed now.
            mode_choices = [('distributed', _('Distributed'))]
            self.fields['mode'].widget = forms.TextInput(attrs={'readonly':
                                                                'readonly'})
            self.fields['mode'].choices = mode_choices
        else:
            mode_choices = [('centralized', _('Centralized')),
                            ('distributed', _('Distributed'))]
            self.fields['mode'].choices = mode_choices

        # TODO(amotoki): Due to Neutron Bug 1378525, Neutron disables
        # PUT operation. It will be fixed in Kilo cycle.
        # self.ha_allowed = api.neutron.get_feature_permission(
        #     self.request, "l3-ha", "update")
        self.ha_allowed = False
        if not self.ha_allowed:
            del self.fields['ha']

    def handle(self, request, data):
        try:
            params = {'admin_state_up': (data['admin_state'] == 'True'),
                      'name': data['name']}
            if self.dvr_allowed:
                params['distributed'] = (data['mode'] == 'distributed')
            if self.ha_allowed:
                params['ha'] = data['ha']
            router = api.neutron.router_update(request, data['router_id'],
                                               **params)
            msg = _('Router %s was successfully updated.') % data['name']
            LOG.debug(msg)
            messages.success(request, msg)
            return router
        except Exception:
            msg = _('Failed to update router %s') % data['name']
            LOG.info(msg)
            exceptions.handle(request, msg, redirect=self.redirect_url)
