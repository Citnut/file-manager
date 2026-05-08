/* jshint esversion: 6 */

const updateRenameValue = ($inputs, $value) => {
  let files = [];
  $inputs.each((i, ele) => {
    files.push({
      original: $(ele).data("original"),
      new: $(ele).val(),
    });
  });
  $value.val(JSON.stringify(files));
};

$select.on("change-files", (e, files) => {
  if (files.length == 0) {
    $(".rename-files").html(
      `<ul class="list-group"><li class="list-group-item text-muted">No files selected</li></ul>`
    );
    return;
  }
  $(".rename-files").html(
    files
      .map((f) => {
        return `
          <div class="mb-3">
            <label class="form-label">
              <strike>${htmlEscape(f.name)}</strike>
            </label>
            <input
              type="text"
              class="form-control rename-files-input"
              data-original="${htmlEscape(f.name)}"
              value="${htmlEscape(f.name)}">
          </div>
        `;
      })
      .join("")
  );
  $(".rename-files-input").on("keydown", (e) => {
    if (e.keyCode == 13) {
      e.preventDefault();
      const $next = $(e.target).parent().nextAll().find("input")[0];
      if ($next) {
        $next.focus();
        if ($next.type == "text") {
          $next.select();
        }
      }
    }
  });
  $(".rename-files").each((i, ele) => {
    const $value = $(ele).parent().find(".rename-files-value");
    const $inputs = $(ele)
      .find(".rename-files-input")
      .on("focus blur change", () => updateRenameValue($inputs, $value));
    updateRenameValue($inputs, $value);
  });
});

// chmod preset buttons
$(document).on("click", ".chmod-preset", (e) => {
  const mode = $(e.currentTarget).data("mode");
  $("#chmod-mode").val(mode);
});

// Bulk upload: multi-file input
$("#bulk-upload-btn").on("click", () => {
  $('<input type="file" multiple style="display:none" id="bulk-upload-input">')
    .appendTo(document.body)
    .on("change", (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const $form = $("form[action='@upload']");
      const $fileInput = $form.find("input[name=file]");
      const $saveasInput = $form.find("input[name=saveas]");

      // For single-file: just set and show modal
      if (files.length === 1) {
        $fileInput[0].files = files;
        $saveasInput.val(files[0].name);
        $form.find("#upload-file-size").val(filesize(files[0].size));
        $(".upload-unhide").fadeIn();
        $("#upload").modal("show");
        return;
      }

      // Multi-file: batch upload via fetch API
      let completed = 0;
      let errors = [];

      files.forEach((file, idx) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("saveas", file.name);

        fetch($form.attr("action"), {
          method: "POST",
          body: formData,
        })
          .then((res) => {
            if (!res.ok) errors.push(file.name);
          })
          .catch(() => errors.push(file.name))
          .finally(() => {
            completed++;
            if (completed === files.length) {
              if (errors.length === 0) {
                alert(`Uploaded ${completed} file(s).`);
              } else {
                alert(`Uploaded ${completed - errors.length}/${completed} file(s). Failed: ${errors.join(", ")}`);
              }
              location.reload();
            }
          });
      });
    })
    .click();
});

updateSelected();