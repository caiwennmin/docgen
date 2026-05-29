// ============================================
// DocGen — Frontend Logic
// ============================================

const state = {
  templatePath: null,
  templateExt: null,
  dataPath: null,
  taskId: null,
};

// ============================================
// Toast notifications
// ============================================
function toast(msg, type = 'error') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ============================================
// Step progress
// ============================================
function setStep(n) {
  document.querySelectorAll('.step-item').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i + 1 === n) el.classList.add('active');
    if (i + 1 < n) el.classList.add('done');
  });
}

function showCard(id) {
  const card = document.getElementById(id);
  card.classList.remove('card-hidden');
  card.classList.add('card-visible');
}

// ============================================
// Upload helper
// ============================================
function setupUpload({ zoneId, inputId, idleId, doneId, url, onSuccess }) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const idle = document.getElementById(idleId);
  const done = document.getElementById(doneId);

  function handleFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    idle.innerHTML = '<div class="spinner" style="border-color:var(--color-border);border-top-color:var(--color-primary);width:24px;height:24px;margin:0 auto"></div><span style="display:block;margin-top:10px;color:var(--color-text-muted);font-size:13px">上传中...</span>';

    fetch(url, { method: 'POST', body: formData })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          idle.style.display = 'none';
          done.style.display = 'block';
          zone.classList.add('upload-done-state');
          onSuccess(data);
        } else {
          idle.innerHTML = '<div class="upload-icon-box"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 4v16M9 11l7-7 7 7M5 24v3h22v-3" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="upload-title">拖拽文件到此处 或 <b>点击选择</b></span><span class="upload-hint">最大 50MB · .docx .xlsx .xls</span>';
          toast(data.error || '上传失败');
        }
      })
      .catch(e => {
        idle.innerHTML = '<div class="upload-icon-box"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 4v16M9 11l7-7 7 7M5 24v3h22v-3" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="upload-title">拖拽文件到此处 或 <b>点击选择</b></span><span class="upload-hint">最大 50MB · .docx .xlsx .xls</span>';
        toast(e.message);
      });
  }

  zone.addEventListener('click', (e) => {
    if (e.target.closest('.upload-done')) return;
    input.click();
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    idle.classList.add('upload-active');
  });
  zone.addEventListener('dragleave', () => {
    idle.classList.remove('upload-active');
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    idle.classList.remove('upload-active');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  input.addEventListener('change', () => {
    if (input.files.length) handleFile(input.files[0]);
  });
}

// ============================================
// Template upload
// ============================================
setupUpload({
  zoneId: 'template-zone',
  inputId: 'template-input',
  idleId: 'template-idle',
  doneId: 'template-done',
  url: '/api/upload-template',
  onSuccess(data) {
    state.templatePath = data.filepath;
    state.templateExt = data.filename.split('.').pop().toLowerCase();

    document.getElementById('template-name').textContent = data.filename;
    const tags = document.getElementById('template-tags');
    if (data.placeholders && data.placeholders.length) {
      tags.innerHTML = data.placeholders.map(p => '<span class="pl-tag">{{' + p + '}}</span>').join('');
    } else {
      tags.innerHTML = '<span class="pl-tag-none">⚠️ 未检测到占位符，请确认模板中使用 {{变量名}} 格式</span>';
    }

    setStep(2);
    showCard('card-data');
  }
});

// ============================================
// Data upload
// ============================================
setupUpload({
  zoneId: 'data-zone',
  inputId: 'data-input',
  idleId: 'data-idle',
  doneId: 'data-done',
  url: '/api/upload-data',
  onSuccess(data) {
    state.dataPath = data.filepath;

    document.getElementById('data-name').textContent = data.filename;
    document.getElementById('data-count').textContent = data.row_count + ' 条 / ' + data.columns.length + ' 列';

    // Render preview table
    const preview = document.getElementById('data-preview');
    let html = '<table><thead><tr>';
    data.columns.forEach(c => html += '<th>' + c + '</th>');
    html += '</tr></thead><tbody>';
    data.preview.forEach(row => {
      html += '<tr>';
      data.columns.forEach(c => html += '<td>' + (row[c] != null ? row[c] : '') + '</td>');
      html += '</tr>';
    });
    html += '</tbody></table>';
    preview.innerHTML = html;

    setStep(3);
    showCard('card-generate');
  }
});

// ============================================
// Preview button
// ============================================
document.getElementById('btn-preview').addEventListener('click', async function () {
  this.disabled = true;
  const orig = this.innerHTML;
  this.innerHTML = '<span class="spinner"></span> 生成中...';

  try {
    const res = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_path: state.templatePath, data_path: state.dataPath }),
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('preview-result').style.display = 'flex';
      document.getElementById('preview-download').href = '/api/download-preview/' + data.filename;
    } else {
      toast(data.error || '预览失败');
    }
  } catch (e) {
    toast(e.message);
  }

  this.disabled = false;
  this.innerHTML = orig;
});

// ============================================
// Generate button
// ============================================
document.getElementById('btn-generate').addEventListener('click', async function () {
  this.disabled = true;
  const orig = this.innerHTML;
  this.innerHTML = '<span class="spinner"></span> 批量生成中...';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_path: state.templatePath, data_path: state.dataPath }),
    });
    const data = await res.json();
    if (data.ok) {
      state.taskId = data.task_id;
      document.getElementById('generate-result').style.display = 'flex';
      document.getElementById('gen-count').textContent = '共 ' + data.file_count + ' 个文件';
      document.getElementById('gen-download').href = '/api/download/' + data.task_id;
      toast('🎉 批量生成完成！共 ' + data.file_count + ' 个文件', 'success');
    } else {
      toast(data.error || '生成失败');
    }
  } catch (e) {
    toast(e.message);
  }

  this.disabled = false;
  this.innerHTML = orig;
});

