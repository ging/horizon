/*
 * Rewrite of horizon.modals.js to be able to use inline-create forms loaded
 * thorugh ajax.
 */

/* Namespace for core functionality related to modal dialogs.
 *
 * Modals in Horizon are treated as a "stack", e.g new ones are added to the
 * top of the stack, and they are always removed in a last-in-first-out
 * order. This allows for things like swapping between modals as part of a
 * workflow, for confirmations, etc.
 *
 * When a new modal is loaded into the DOM, it fires a "new_modal" event which
 * event handlers can listen for. However, for consistency, it is better to
 * add methods which should be run on instantiation of any new modal to be
 * applied via the horizon.inline_create.addModalInitFunction method.
 */
horizon.inline_create = {
  // Storage for our current jqXHR object.
  _request: null,
  spinner: null,
  _init_functions: []
};

/*horizon.inline_create.addModalInitFunction = function (f) {
  horizon.inline_create._init_functions.push(f);
};

horizon.inline_create.initModal = function (modal) {
  $(horizon.inline_create._init_functions).each(function (index, f) {
    f(modal);
  });
};
*/
/*/* Creates a modal dialog from the client-side template. *
horizon.inline_create.create = function (title, body, confirm, cancel) {
  if (!cancel) {
    cancel = gettext("Cancel");
  }
  var template = horizon.templates.compiled_templates["#modal_template"],
    params = {title: title, body: body, confirm: confirm, cancel: cancel},
    modal = $(template.render(params)).appendTo("#inline_modal_wrapper");
  return modal;
};*/

/*horizon.inline_create.success = function (data, textStatus, jqXHR) {
  var modal;
  console.log(data+','+textStatus)
  //$('#inline_modal_wrapper').append(data);
  //modal = $('.modal:last');
  //modal.modal();
  $('#collapseOne').collapse()
  //$(modal).trigger("new_modal", modal);
  return modal;
};  */

horizon.inline_create.modal_spinner = function (text) {
  // Adds a spinner with the desired text in a modal window.
  var template = horizon.templates.compiled_templates["#spinner-modal"];
  horizon.inline_create.spinner = $(template.render({text: text}));
  horizon.inline_create.spinner.appendTo("#inline_modal_wrapper");
  horizon.inline_create.spinner.modal({backdrop: 'static'});
  horizon.inline_create.spinner.find(".modal-body").spin(horizon.conf.spinner_options.modal);
};  

/*horizon.inline_create.init_wizard = function () {
  // If workflow is in wizard mode, initialize wizard.
  var _max_visited_step = 0;
  var _validate_steps = function (start, end) {
    var $form = $('.workflow > form'),
      response = {};

    if (typeof end === 'undefined') {
      end = start;
    }

    // Clear old errors.
    $form.find('td.actions div.alert-danger').remove();
    $form.find('.form-group.error').each(function () {
      var $group = $(this);
      $group.removeClass('error');
      $group.find('span.help-block.error').remove();
    });

    // Send the data for validation.
    $.ajax({
      type: 'POST',
      url: $form.attr('action'),
      headers: {
        'X-Horizon-Validate-Step-Start': start,
        'X-Horizon-Validate-Step-End': end
      },
      data: $form.serialize(),
      dataType: 'json',
      async: false,
      success: function (data) { response = data; }
    });

    // Handle errors.
    if (response.has_errors) {
      var first_field = true;

      $.each(response.errors, function (step_slug, step_errors) {
        var step_id = response.workflow_slug + '__' + step_slug,
          $fieldset = $form.find('#' + step_id);
        $.each(step_errors, function (field, errors) {
          var $field;
          if (field === '__all__') {
            // Add global errors.
            $.each(errors, function (index, error) {
              $fieldset.find('td.actions').prepend(
                '<div class="alert alert-message alert-danger">' +
                error + '</div>');
            });
            $fieldset.find('input,  select, textarea').first().focus();
            return;
          }
          // Add field errors.
          $field = $fieldset.find('[name="' + field + '"]');
          $field.closest('.form-group').addClass('error');
          $.each(errors, function (index, error) {
            $field.before(
              '<span class="help-block error">' +
              error + '</span>');
          });
          // Focus the first invalid field.
          if (first_field) {
            $field.focus();
            first_field = false;
          }
        });
      });

      return false;
    }
  };

  $('.workflow.wizard').bootstrapWizard({
    tabClass: 'wizard-tabs',
    nextSelector: '.button-next',
    previousSelector: '.button-previous',
    onTabShow: function (tab, navigation, index) {
      var $navs = navigation.find('li');
      var total = $navs.length;
      var current = index;
      var $footer = $('.modal-footer');
      _max_visited_step = Math.max(_max_visited_step, current);
      if (current + 1 >= total) {
        $footer.find('.button-next').hide();
        $footer.find('.button-final').show();
      } else {
        $footer.find('.button-next').show();
        $footer.find('.button-final').hide();
      }
      $navs.each(function(i) {
        $this = $(this);
        if (i <= _max_visited_step) {
          $this.addClass('done');
        } else {
          $this.removeClass('done');
        }
      });
    },
    onNext: function ($tab, $nav, index) {
      return _validate_steps(index - 1);
    },
    onTabClick: function ($tab, $nav, current, index) {
      // Validate if moving forward, but move backwards without validation
      return (index <= current ||
              _validate_steps(current, index - 1) !== false);
    }
  });
};*/


horizon.addInitFunction(function() {
  /*// Bind handler for initializing new modals.
  $('#inline_modal_wrapper').on('new_modal', function (evt, modal) {
    horizon.inline_create.initModal(modal);
  });

  // Bind "cancel" button handler.
  $(document).on('click', '.modal .cancel', function (evt) {
    $(this).closest('.modal').modal('hide');
    evt.preventDefault();
  });*/

  // AJAX form submissions from modals. Makes validation happen in-modal.
  $('input.ajax-inline-create').on('click', function (evt) {
    console.log('intercepted submit');
    var $button = $(this),
      $form = $button.parents("form.ajax-inline-create"),
      update_field_id = $form.attr("data-add-to-field"),
      headers = {},
      formData, ajaxOpts, featureFileList, featureFormData;


    formData = $form.serialize();
    evt.preventDefault();

    // Prevent duplicate form POSTs
    $button.prop("disabled", true);

    if (update_field_id) {
      headers["X-Horizon-Add-To-Field"] = update_field_id;
    }

    ajaxOpts = {
      type: "POST",
      url: $form.attr('action'),
      headers: headers,
      data: formData,
      beforeSend: function () {
        console.log('before send');
        //$("#inline_modal_wrapper .modal").last().modal("hide");
        //$('.ajax-modal, .dropdown-toggle').attr('disabled', true);
        horizon.inline_create.modal_spinner(gettext("Working"));
      },
      complete: function () {
        horizon.inline_create.spinner.modal('hide');
        //$("#inline_modal_wrapper .modal").last().modal("show");
        //$button.removeAttr('disabled');
      },
      success: function (data, textStatus, jqXHR) {
        console.log('success');

        var redirect_header = jqXHR.getResponseHeader("X-Horizon-Location"),
          add_to_field_header = jqXHR.getResponseHeader("X-Horizon-Add-To-Field"),
          json_data, field_to_update;
        /*if (redirect_header === null) {
            $('.ajax-modal, .dropdown-toggle').removeAttr("disabled");
        }*/
        /*//$form.closest(".modal").modal("hide");
        if (redirect_header) {
          console.log('redirect')
          location.href = redirect_header;
        }*/
        //else if (add_to_field_header) {
        if (add_to_field_header) {
          console.log('add to field')
          json_data = $.parseJSON(data);
          field_to_update = $("#" + add_to_field_header);
          console.log(json_data)
          var row_template =
                '<div class="inline_edit_available sortable normal_column" data-cell-name="name" data-update-url="/idm/myApplications/roles/?action=cell_update&amp;table=roles&amp;cell_name=name&amp;obj_id='+json_data[0]+'">'+
                  '<div class="data">' + json_data[1] +'</div>'+
                  '<button class="ajax-inline-edit"><span class="fa fa-pencil"></span></button>'+
                  '<div class="inline-edit-status"></div>'+
                '</div>'+
                '<div class="actions_column">'+
                  '<div class="description">' +
                    '<button class="btn btn-default btn-sm btn-danger" id="roles__row_'+json_data[0]+'__action_delete" name="action" value="roles__delete__'+json_data[0]+'" type="submit"><span class="fa fa-remove"></span></button>'+
                  '</div>' + 
                '</div>';
          field_to_update.append(row_template);
          field_to_update.change();
          field_to_update.val(json_data[0]);

          //$('#create_role_form :submit').removeClass("disabled");
          $('#collapseOne').collapse('hide');
          $('#id_name').val('');
        } else {
          console.log('else')
          horizon.inline_create.success(data, textStatus, jqXHR);
        }
      },
      error: function (jqXHR, status, errorThrown) {
        console.log('error');

        if (jqXHR.getResponseHeader('logout')) {
          location.href = jqXHR.getResponseHeader("X-Horizon-Location");
        } else {
         // $('.ajax-modal, .dropdown-toggle').removeAttr("disabled");
          $form.closest(".modal").modal("hide");
          horizon.alert("danger", gettext("There was an error submitting the form. Please try again."));
        }
      }
    };

    /*if (modalFileUpload) {
      ajaxOpts.contentType = false;  // tell jQuery not to process the data
      ajaxOpts.processData = false;  // tell jQuery not to set contentType
    }*/
    $.ajax(ajaxOpts);
    console.log('ajax!');
  });

  /*// Position modal so it's in-view even when scrolled down.
  $(document).on('show.bs.modal', '.modal', function (evt) {
    // Filter out indirect triggers of "show" from (for example) tabs.
    if ($(evt.target).hasClass("modal")) {
      var scrollShift = $('body').scrollTop() || $('html').scrollTop(),
        $this = $(this),
        topVal = $this.css('top');
      $this.css('top', scrollShift + parseInt(topVal, 10));
    }
    // avoid closing the modal when escape is pressed on a select input
    $("select", evt.target).keyup(function (e) {
      if (e.keyCode === 27) {
        // remove the focus on the select, so double escape close the modal
        e.target.blur();
        e.stopPropagation();
      }
    });
  });*/
  console.log('loaded roles_inline_create.js!');
  /*// Focus the first usable form field in the modal for accessibility.
  horizon.inline_create.addModalInitFunction(function (modal) {
    $(modal).find(":text, select, textarea").filter(":visible:first").focus();
  });
  */
 /* horizon.inline_create.addModalInitFunction(horizon.datatables.validate_button);
  horizon.inline_create.addModalInitFunction(horizon.utils.loadAngular);*/

  /*// Load modals for ajax-modal links.
  $(document).on('click', '.ajax-modal', function (evt) {
    var $this = $(this);
    // If there's an existing modal request open, cancel it out.
    if (horizon.inline_create._request && typeof(horizon.inline_create._request.abort) !== undefined) {
      horizon.inline_create._request.abort();
    }

    horizon.inline_create._request = $.ajax($this.attr('data-create-url'), {
      beforeSend: function () {
        horizon.inline_create.modal_spinner(gettext("Loading"));
      },
      complete: function () {
        // Clear the global storage;
        horizon.inline_create._request = null;
        horizon.inline_create.spinner.modal('hide');
      },
      error: function(jqXHR, status, errorThrown) {
        if (jqXHR.status === 401){
          var redir_url = jqXHR.getResponseHeader("X-Horizon-Location");
          if (redir_url){
            location.href = redir_url;
          } else {
            location.reload(true);
          }
        }
        else {
          if (!horizon.ajax.get_messages(jqXHR)) {
            // Generic error handler. Really generic.
            horizon.alert("danger", gettext("An error occurred. Please try again later."));
          }
        }
      },
      success: function (data, textStatus, jqXHR) {
        var update_field_id = $this.attr('data-add-to-field'),
          modal,
          form;
        modal = horizon.inline_create.success(data, textStatus, jqXHR);
        if (update_field_id) {
          form = modal.find("form");
          if (form.length) {
            form.attr("data-add-to-field", update_field_id);
          }
        }
      }
    });
    evt.preventDefault();
  });*/


  /*/* Manage the modal "stack" *

  // After a modal has been shown, hide any other modals that are already in
  // the stack. Only one modal can be visible at the same time.
  $(document).on("show.bs.modal", ".modal", function () {
    var modal_stack = $("#inline_modal_wrapper .modal");
    modal_stack.splice(modal_stack.length - 1, 1);
    modal_stack.modal("hide");
  });*/
/*
  // After a modal has been fully hidden, remove it to avoid confusion.
  // Note: the modal should only be removed if it is the "top" of the stack of
  // modals, e.g. it's the one currently being interacted with and isn't just
  // temporarily being hidden.
  $(document).on('hidden.bs.modal', '.modal', function () {
    var $this = $(this),
      modal_stack = $("#inline_modal_wrapper .modal");
    if ($this[0] === modal_stack.last()[0] || $this.hasClass("loading")) {
      $this.remove();
      if (!$this.hasClass("loading")) {
        $("#inline_modal_wrapper .modal").last().modal("show");
      }
    }
  });*/
  
});