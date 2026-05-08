/* jshint esversion: 6 */

let $select = $(".multi-select");

$select.on("change-files", (e, files) => {
  $(".multi-files-value").val(JSON.stringify(files.map((f) => f.name)));
  if (files.length == 0) {
    $(".multi-files").html(
      `<li class="list-group-item text-muted">No files selected</li>`
    );
    $(".multi-files-summary").text("");
    return;
  }
  $(".multi-files-summary").text(`${files.length} item(s) selected`);
  $(".multi-files").html(
    files
      .map((f) => {
        const badge = `<span class="badge rounded-pill bg-secondary badge-alignment">
          ${filesize(f.size)}
        </span>`;
        return `
          <li class="list-group-item d-flex align-items-start justify-content-between">
            <span class="name">${htmlEscape(f.name)}</span>
            ${f.type == "directory" ? `<span class="badge rounded-pill bg-dark badge-alignment">dir</span>` : badge}
          </li>
        `;
      })
      .join("")
  );
  const hasDirectory = files.reduce((a, f) => a || f.type == "directory", false);
  const totalSize = files.map((f) => f.size || 0).reduce((a, b) => a + b, 0);
  if (hasDirectory) {
    $(".multi-files-total").val("");
  } else {
    $(".multi-files-total").val(filesize(totalSize));
  }
});

const updateSelected = () => {
  let $selected = $(".multi-select:checked");
  let files = [];
  $selected.each((i, ele) => {
    files.push({
      name: $(ele).data("select"),
      type: $(ele).data("select-type"),
      size: $(ele).data("select-size"),
    });
  });
  $select.trigger("change-files", [files]);
};

$select.on("change", updateSelected);

// Keyboard shortcuts
$(document).on("keydown", (e) => {
  // Del / Backspace -> delete
  if (e.key === "Delete" && !$(":focus").is("input,textarea")) {
    const checked = $(".multi-select:checked");
    if (checked.length > 0) {
      $("#delete").modal("show");
    }
  }
  // Ctrl+A -> select all
  if (e.ctrlKey && e.key === "a" && !$(":focus").is("input,textarea")) {
    e.preventDefault();
    $select.prop("checked", true);
    updateSelected();
  }
  // Escape -> deselect all
  if (e.key === "Escape") {
    $select.prop("checked", false);
    updateSelected();
  }
});

updateSelected();