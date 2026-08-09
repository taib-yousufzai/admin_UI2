const fs = require('fs');
let css = fs.readFileSync('C:/Users/Daksh/OneDrive/Desktop/New folder/marginapexx/app/admin-layout.css', 'utf8');

const pioCSS = `
/* ===== PAY-IN / PAY-OUT PAGE (Light Theme) ===== */
.pio-root {
  font-family: 'Inter', sans-serif;
  background: transparent;
  color: #1a1a1a;
}

.pio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 2px solid #1a1a1a;
}
.pio-header h1 {
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.4px;
  color: #1a1a1a;
  margin: 0;
}
.pio-header h1 span { color: #888; font-weight: 300; }

.pio-super-admin-icon {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1a1a1a;
  padding: 6px 22px 6px 16px;
  border-radius: 60px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border: 1px solid rgba(255,255,255,0.06);
  cursor: default;
}
.pio-icon-wrapper {
  width: 36px; height: 36px; background: rgba(255,255,255,0.10); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.10);
}
.pio-icon-wrapper svg { width: 20px; height: 20px; fill: white; opacity: 0.9; }
.pio-label-text { color: white; font-weight: 600; font-size: 14px; letter-spacing: 0.2px; opacity: 0.95; }
.pio-role-sub { font-weight: 400; font-size: 10px; opacity: 0.6; display: block; letter-spacing: 0.3px; margin-top: -1px; }

.pio-panel {
  background: white;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.02), 0 1px 4px rgba(0,0,0,0.02);
  border: 1px solid rgba(0,0,0,0.03);
  padding: 24px 28px;
  margin-bottom: 20px;
}
.pio-panel:hover { box-shadow: 0 8px 26px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02); }

.pio-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eaeaea;
  flex-wrap: wrap;
  gap: 8px;
}
.pio-panel-header h2 { font-size: 18px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.2px; margin: 0; }
.pio-badge-role { font-size: 10px; background: #eaeaea; color: #555; padding: 3px 14px; font-weight: 600; border-radius: 40px; letter-spacing: 0.2px; }

/* TOP ROW */
.pio-top-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #d0d0d0;
}
.pio-nav-tabs { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; flex: 1; }
.pio-tab-btn {
  padding: 6px 16px;
  border: 1px solid #d0d0d0;
  border-radius: 40px;
  background: white;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.15s;
}
.pio-tab-btn:hover { background: #f5f5f5; }
.pio-tab-btn.active { background: #1a1a1a; border-color: #1a1a1a; color: white; }

.pio-top-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-left: auto; }
.pio-action-btn-sm {
  padding: 6px 16px;
  border-radius: 40px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid #d0d0d0;
  background: white;
  color: #1a1a1a;
  white-space: nowrap;
}
.pio-action-btn-sm:hover { background: #f5f5f5; }
.pio-action-btn-sm.primary { background: #1a1a1a; border-color: #1a1a1a; color: white; }
.pio-action-btn-sm.primary:hover { background: #2a2a2a; }

/* STATS */
.pio-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
.pio-stat-card {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid #d0d0d0;
  text-align: center;
}
.pio-stat-label { font-size: 10px; font-weight: 500; color: #555; text-transform: uppercase; letter-spacing: 0.3px; }
.pio-stat-value { font-size: 22px; font-weight: 700; color: #1a1a1a; margin-top: 2px; }
.pio-stat-value.positive { color: #16a34a; }
.pio-stat-value.negative { color: #dc2626; }

/* BATCH ACTIONS */
.pio-batch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  background: #f5f5f5;
  border-radius: 8px;
  border: 1px solid #d0d0d0;
  margin-bottom: 12px;
}
.pio-batch-select {
  padding: 5px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 40px;
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  background: white;
  color: #1a1a1a;
  outline: none;
  cursor: pointer;
}
.pio-batch-select:focus { border-color: #1a1a1a; }
.pio-export-btn {
  padding: 5px 16px;
  border: 1px solid #16a34a;
  border-radius: 40px;
  background: #16a34a;
  color: white;
  font-size: 11px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: all 0.15s;
  margin-left: auto;
  white-space: nowrap;
}
.pio-export-btn:hover { background: #15803d; }

/* FILTER BAR */
.pio-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
}
.pio-filter-bar input, .pio-filter-bar select {
  padding: 7px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 40px;
  font-size: 12px;
  font-family: 'Inter', sans-serif;
  background: white;
  color: #1a1a1a;
  flex: 1;
  min-width: 120px;
  outline: none;
}
.pio-filter-bar input:focus, .pio-filter-bar select:focus { border-color: #1a1a1a; box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
.pio-filter-label { font-size: 11px; font-weight: 500; color: #555; }
.pio-date-input { min-width: 130px !important; flex: 1; }

/* TABLE */
.pio-table-wrap {
  overflow-x: auto;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  background: white;
  -webkit-overflow-scrolling: touch;
  margin-bottom: 16px;
}
.pio-table-wrap table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 800px;
}
.pio-table-wrap th {
  text-align: left;
  padding: 10px 12px;
  background: #f5f5f5;
  font-weight: 600;
  color: #555;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 1px solid #d0d0d0;
  position: sticky;
  top: 0;
  z-index: 10;
}
.pio-table-wrap td {
  padding: 10px 12px;
  border-bottom: 1px solid #eaeaea;
  vertical-align: middle;
  font-size: 12px;
  color: #1a1a1a;
}
.pio-table-wrap tr:last-child td { border-bottom: none; }
.pio-table-wrap tr:hover td { background: #f5f5f5; }

.pio-status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 40px;
  font-size: 10px;
  font-weight: 600;
}
.pio-status-badge.completed { background: #dcfce7; color: #16a34a; }
.pio-status-badge.failed { background: #fee2e2; color: #dc2626; }
.pio-status-badge.cancelled { background: #eaeaea; color: #555; }
.pio-status-badge.pending { background: #fef9c3; color: #854d0e; }

.pio-action-btn {
  padding: 4px 12px;
  border-radius: 40px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: all 0.15s;
  border: 2px solid transparent;
  background: transparent;
  min-width: 40px;
  text-align: center;
}
.pio-action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.pio-action-btn.approve { border-color: #16a34a; color: #16a34a; }
.pio-action-btn.approve:hover:not(:disabled) { background: #dcfce7; }
.pio-action-btn.reject { border-color: #dc2626; color: #dc2626; }
.pio-action-btn.reject:hover:not(:disabled) { background: #fee2e2; }

.pio-view-btn {
  padding: 4px 12px;
  border: 2px solid #2563eb;
  border-radius: 40px;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  color: #2563eb;
  cursor: pointer;
  transition: all 0.15s;
}
.pio-view-btn:hover { background: #dbeafe; }

.pio-delete-btn {
  padding: 4px 10px;
  border: 2px solid #dc2626;
  border-radius: 40px;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.15s;
}
.pio-delete-btn:hover { background: #fee2e2; }

.pio-approve-col, .pio-reject-col { min-width: 50px; }

/* PAGINATION */
.pio-pagination { display: flex; align-items: center; gap: 12px; justify-content: center; margin-top: 16px; }
.pio-page-btn {
  padding: 6px 16px; border: 1px solid #d0d0d0; border-radius: 40px; background: white;
  font-size: 12px; font-weight: 500; font-family: 'Inter', sans-serif; color: #1a1a1a;
  cursor: pointer; transition: 0.15s;
}
.pio-page-btn:hover:not(:disabled) { background: #f5f5f5; border-color: #1a1a1a; }
.pio-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.pio-page-info { font-size: 12px; color: #555; }

/* RULES SECTION */
.pio-rules-section { display: flex; flex-direction: column; gap: 20px; }
.pio-rule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eaeaea;
}
.pio-rule-label { font-size: 13px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
.pio-rule-sub { font-size: 11px; color: #888; }
.pio-toggle-switch {
  width: 42px; height: 24px; background: #d0d0d0; border-radius: 40px; position: relative;
  cursor: pointer; transition: background 0.2s; flex-shrink: 0;
}
.pio-toggle-switch.active { background: #2563eb; }
.pio-toggle-switch::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;
  background: white; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.pio-toggle-switch.active::after { transform: translateX(18px); }

.pio-rule-field { display: flex; flex-direction: column; gap: 8px; }
.pio-days-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.pio-day-chip {
  padding: 5px 14px; border: 1px solid #d0d0d0; border-radius: 40px;
  font-size: 12px; font-weight: 500; color: #555; cursor: pointer; transition: 0.15s;
  user-select: none;
}
.pio-day-chip.selected { background: #1a1a1a; border-color: #1a1a1a; color: white; }
.pio-day-chip:hover:not(.selected) { background: #f5f5f5; }

.pio-rule-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
.pio-rule-input {
  padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 13px;
  font-family: 'Inter', sans-serif; background: white; color: #1a1a1a; outline: none;
}
.pio-rule-input:focus { border-color: #1a1a1a; box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }

.pio-rules-textarea {
  width: 100%; padding: 12px; border: 1px solid #d0d0d0; border-radius: 8px;
  font-family: 'Inter', sans-serif; font-size: 13px; resize: vertical; outline: none;
  color: #1a1a1a;
}
.pio-rules-textarea:focus { border-color: #1a1a1a; box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }

.pio-btn-primary {
  padding: 10px 28px; border: none; border-radius: 40px; background: #1a1a1a;
  color: white; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif;
  cursor: pointer; transition: 0.15s;
}
.pio-btn-primary:hover { background: #2a2a2a; }
.pio-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.pio-footer-note {
  margin-top: 8px; text-align: right; font-size: 12px; color: #555;
  border-top: 1px solid #eaeaea; padding-top: 14px;
}

/* MODAL */
.pio-modal-overlay {
  display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.35); z-index: 3000; justify-content: center;
  align-items: center; padding: 20px;
}
.pio-modal-overlay.active { display: flex; }
.pio-modal {
  background: white; border-radius: 14px; padding: 24px 28px;
  max-width: 460px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.15); max-height: 90vh; overflow-y: auto;
}
.pio-modal h3 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.pio-modal-sub { font-size: 12px; color: #555; margin-bottom: 16px; }
.pio-modal-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
.pio-modal-field label { font-size: 11px; font-weight: 600; color: #555; }
.pio-modal-field input, .pio-modal-field select {
  padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px;
  font-size: 13px; font-family: 'Inter', sans-serif; outline: none;
}
.pio-modal-field input:focus, .pio-modal-field select:focus { border-color: #1a1a1a; box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
.pio-status-options { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.pio-status-option {
  display: flex; align-items: center; gap: 5px; font-size: 12px;
  font-weight: 500; color: #1a1a1a; cursor: pointer;
}
.pio-status-option input[type="radio"] { margin: 0; accent-color: #1a1a1a; }
.pio-dot {
  display: inline-block; width: 10px; height: 10px; border-radius: 50%;
}
.pio-dot.completed { background: #16a34a; }
.pio-dot.failed { background: #dc2626; }
.pio-dot.cancelled { background: #888; }
.pio-modal-actions {
  display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; flex-wrap: wrap;
}
.pio-modal-actions button {
  padding: 8px 24px; border-radius: 40px; font-size: 13px; font-weight: 600;
  font-family: 'Inter', sans-serif; cursor: pointer; border: 1px solid #d0d0d0;
  background: white; color: #1a1a1a; transition: 0.15s;
}
.pio-modal-actions button:hover { background: #f5f5f5; }
.pio-modal-actions .pio-btn-primary { border: none; }

/* LIGHTBOX */
.pio-lightbox-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8);
  z-index: 5000; display: flex; justify-content: center; align-items: center; padding: 20px;
}
.pio-lightbox {
  position: relative; max-width: 90vw; max-height: 90vh; background: white;
  border-radius: 12px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.pio-lightbox img { max-width: 100%; max-height: 85vh; display: block; }
.pio-lightbox-close {
  position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; border-radius: 50%;
  background: rgba(0,0,0,0.5); color: white; border: none; font-size: 14px;
  cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;
}

@media (max-width: 768px) {
  .pio-header h1 { font-size: 20px; }
  .pio-panel { padding: 12px; }
  .pio-stats-row { grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .pio-stat-value { font-size: 14px; }
  .pio-rule-grid2 { grid-template-columns: 1fr; }
  .pio-modal-actions { flex-direction: column; }
  .pio-modal-actions button { width: 100%; text-align: center; }
}
`;

const marker = '.adm-script-list {';
const idx = css.indexOf(marker);
if (idx !== -1) {
  css = css.substring(0, idx) + pioCSS + '\n' + css.substring(idx);
  fs.writeFileSync('C:/Users/Daksh/OneDrive/Desktop/New folder/marginapexx/app/admin-layout.css', css);
  console.log('PayinOut CSS injected successfully.');
} else {
  console.log('Marker not found');
}
