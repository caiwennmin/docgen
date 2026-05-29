// DocGen - 前端交互逻辑

let state = {
  templatePath: null,
  templateExt: null,
  dataPath: null,
  taskId: null,
};

// --- Helper: file upload handler ---
function setupUpload(zoneId, inputId, successId, placeholderId, onSuccess) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);

  zone.addEventListener("click", () => input.click());
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.style.borderColor = "#4F46E5"; });
  zone.addEventListener("dragleave", () => { zone.style.borderColor = "#E2E8F0"; });
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.style.borderColor = "#E2E8F0";
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  input.addEventListener("change", () => { if (input.files.length) handleFile(input.files[0]); });

  async function handleFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(onSuccess.url, { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        document.getElementById(placeholderId).style.display = "none";
        document.getElementById(successId).style.display = "flex";
        onSuccess.callback(data);
      }
    } catch (e) {
      alert("上传失败: " + e.message);
    }
  }
}

// --- Template upload ---
setupUpload("template-zone", "template-input", "template-success", "template-placeholder", {
  url: "/api/upload-template",
  callback(data) {
    state.templatePath = data.filepath;
    state.templateExt = data.filename.split(".").pop().toLowerCase();

    document.getElementById("template-name").textContent = "📄 " + data.filename;
    const ph = data.placeholders;
    document.getElementById("template-placeholders").textContent =
      ph.length ? "占位符: " + ph.map(p => "{{" + p + "}}").join(", ") : "未检测到占位符";

    document.getElementById("step-data").style.display = "block";
  }
});

// --- Data upload ---
setupUpload("data-zone", "data-input", "data-success", "data-placeholder", {
  url: "/api/upload-data",
  callback(data) {
    state.dataPath = data.filepath;

    document.getElementById("data-name").textContent = "📊 " + data.filename;
    document.getElementById("data-count").textContent = data.row_count + " 条数据, " + data.columns.length + " 列";

    // preview table
    const preview = document.getElementById("data-preview");
    let html = "<table><thead><tr>";
    data.columns.forEach(c => { html += `<th>${c}</th>`; });
    html += "</tr></thead><tbody>";
    data.preview.forEach(row => {
      html += "<tr>";
      data.columns.forEach(c => { html += `<td>${row[c] || ""}</td>`; });
      html += "</tr>";
    });
    html += "</tbody></table>";
    preview.innerHTML = html;
    preview.style.display = "block";

    document.getElementById("step-actions").style.display = "block";
}
});

// --- Preview ---
document.getElementById("btn-preview").addEventListener("click", async function() {
  this.disabled = true;
  this.innerHTML = '<span class="spinner"></span> 生成预览中...';

  try {
    const res = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_path: state.templatePath, data_path: state.dataPath }),
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById("preview-result").style.display = "block";
      document.getElementById("preview-download").href = "/api/download-preview/" + data.filename;
    }
  } catch (e) { alert("预览失败: " + e.message); }

  this.disabled = false;
  this.innerHTML = "👁️ 预览（首条数据）";
});

// --- Generate All ---
document.getElementById("btn-generate").addEventListener("click", async function() {
  this.disabled = true;
  this.innerHTML = '<span class="spinner"></span> 批量生成中...';

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_path: state.templatePath, data_path: state.dataPath }),
    });
    const data = await res.json();
    if (data.ok) {
      state.taskId = data.task_id;
      document.getElementById("generate-result").style.display = "block";
      document.getElementById("gen-count").textContent = "共 " + data.file_count + " 个文件";
      document.getElementById("gen-download").href = "/api/download/" + data.task_id;
    }
  } catch (e) { alert("生成失败: " + e.message); }

  this.disabled = false;
  this.innerHTML = "🚀 批量生成全部";
});

