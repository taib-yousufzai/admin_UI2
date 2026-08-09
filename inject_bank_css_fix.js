const fs = require('fs');
let css = fs.readFileSync('C:/Users/Daksh/OneDrive/Desktop/New folder/marginapexx/app/admin-layout.css', 'utf8');

const bkmCSS = `
/* ===== BANK MANAGEMENT PAGE (Light Theme - Scaled Up) ===== */
.bkm-dashboard {
  font-family: 'Inter', sans-serif;
  color: #1a1a1a;
  padding: 10px 0;
}

.bkm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 2px solid #1a1a1a;
}
.bkm-header h1 { font-weight: 700; font-size: 28px; letter-spacing: -0.3px; color: #1a1a1a; margin: 0; }
.bkm-header h1 span { color: #888888; font-weight: 300; }

.bkm-super-admin-icon {
  display: flex; align-items: center; gap: 8px; background: #1a1a1a;
  padding: 6px 20px 6px 14px; border-radius: 60px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid rgba(255,255,255,0.06);
  cursor: default;
}
.bkm-icon-wrapper {
  width: 36px; height: 36px; background: rgba(255,255,255,0.10); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.10);
}
.bkm-icon-wrapper svg { width: 18px; height: 18px; fill: white; opacity: 0.9; }
.bkm-label-text { color: white; font-weight: 600; font-size: 14px; letter-spacing: 0.2px; opacity: 0.95; }
.bkm-role-sub { font-weight: 400; font-size: 11px; opacity: 0.6; display: block; letter-spacing: 0.3px; margin-top: -1px; }

.bkm-action-row {
  display: flex; flex-wrap: nowrap; align-items: center; gap: 1rem;
  background: #ffffff; padding: 0.75rem 1.25rem; border-radius: 60px;
  border: 1px solid rgba(0,0,0,0.04); margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.02);
  width: 100%;
}
.bkm-action-row .left-group { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; overflow: hidden; }
.bkm-action-row .right-group { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

.bkm-filter-label { font-size: 14px; font-weight: 500; color: #555555; white-space: nowrap; }

.bkm-dropdown-wrapper { position: relative; display: inline-block; flex: 1; min-width: 120px; max-width: 250px; }
.bkm-dropdown-btn {
  background: #f5f5f5; border: 1px solid #d0d0d0; border-radius: 60px;
  padding: 0.4rem 1.2rem; font-size: 14px; font-weight: 500;
  color: #1a1a1a; cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
  transition: 0.2s; white-space: nowrap; width: 100%; justify-content: space-between;
  min-height: 38px;
}
.bkm-dropdown-btn:hover { border-color: #1a1a1a; background: #eaeaea; }
.bkm-dropdown-menu {
  position: absolute; top: calc(100% + 5px); left: 0; background: #ffffff;
  border: 1px solid #d0d0d0; border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  min-width: 150px; display: none; overflow: hidden; z-index: 100; max-height: 250px; overflow-y: auto;
}
.bkm-dropdown-menu.open { display: block; }
.bkm-dropdown-menu .item {
  padding: 0.5rem 1rem; font-size: 14px; color: #1a1a1a; cursor: pointer;
  transition: 0.1s; border-bottom: 1px solid #eaeaea;
}
.bkm-dropdown-menu .item:hover { background: #f5f5f5; }

.bkm-btn-add {
  background: #1a1a1a; border: none; color: #ffffff; padding: 0.4rem 1.5rem;
  border-radius: 60px; font-weight: 500; font-size: 14px; cursor: pointer;
  transition: 0.2s; white-space: nowrap; min-height: 38px; min-width: 120px;
  display: flex; align-items: center; justify-content: center;
}
.bkm-btn-add:hover { background: #2d2d2d; transform: scale(1.02); }

.bkm-section-title {
  font-size: 16px; font-weight: 600; color: #1a1a1a; margin-bottom: 10px;
  padding-bottom: 5px; border-bottom: 1px solid #eaeaea; margin-top: 16px;
}
.bkm-badge-count { font-size: 13px; font-weight: 500; color: #555555; margin-left: 0.4rem; background: #eaeaea; padding: 2px 8px; border-radius: 20px; }

.bkm-deposit-summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px; }
.bkm-deposit-summary-card {
  background: #ffffff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 2px 8px rgba(0,0,0,0.02); padding: 12px 16px;
  display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.15s;
}
.bkm-deposit-summary-card:hover { background: #f5f5f5; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
.bkm-deposit-summary-card .bank-name { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.bkm-deposit-summary-card .deposit-amount { font-size: 15px; font-weight: 600; color: #1f6d4a; }

.bkm-bank-txn-section {
  margin-top: 10px; margin-bottom: 20px; background: #ffffff;
  border-radius: 12px; border: 1px solid rgba(0,0,0,0.04); box-shadow: 0 2px 12px rgba(0,0,0,0.02);
  overflow: hidden;
}
.bkm-bank-txn-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; background: #f5f5f5; border-bottom: 1px solid #eaeaea;
  cursor: pointer; transition: 0.15s;
}
.bkm-bank-txn-header:hover { background: #eaeaea; }
.bkm-bank-txn-header .bank-name { font-weight: 600; font-size: 15px; color: #1a1a1a; display: flex; align-items: center; gap: 8px; }
.bkm-bank-txn-header .bank-txn-count { font-size: 12px; color: #555555; background: #d0d0d0; padding: 2px 8px; border-radius: 30px; }
.bkm-bank-txn-header .bank-txn-total { font-size: 14px; font-weight: 600; color: #1f6d4a; }
.bkm-bank-txn-body { max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.3s ease, opacity 0.25s ease; }
.bkm-bank-txn-body.open { max-height: 600px; opacity: 1; overflow-y: auto; }
.bkm-bank-txn-body table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bkm-bank-txn-body th { text-align: left; padding: 12px 20px; background: #fcfcfc; color: #555555; font-weight: 600; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #d0d0d0; }
.bkm-bank-txn-body td { padding: 12px 20px; border-bottom: 1px solid #eaeaea; color: #1a1a1a; }
.bkm-bank-txn-body tr:hover td { background: #f9f9f9; }
.bkm-tx-type.credit { color: #1f6d4a; font-weight: 600; }
.bkm-tx-type.rotation { color: #1a3a5a; font-weight: 600; }
.bkm-tx-status { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 40px; }
.bkm-tx-status.success { background: #e3f5eb; color: #1f6d4a; }
.bkm-tx-status.failed { background: #f5e8e8; color: #b33c3c; }
.bkm-tx-status.pending { background: #fdf3e0; color: #a06a2a; }
.bkm-btn-change-bank { background: #f5f5f5; border: 1px solid #d0d0d0; border-radius: 30px; padding: 4px 12px; font-size: 12px; font-weight: 500; color: #1a1a1a; cursor: pointer; transition: 0.15s; }
.bkm-btn-change-bank:hover { background: #eaeaea; }

.bkm-banks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-bottom: 24px; }
.bkm-bank-card {
  background: #ffffff; border-radius: 12px; border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 4px 12px rgba(0,0,0,0.02); padding: 16px 20px; transition: all 0.2s; position: relative;
}
.bkm-bank-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.06); transform: translateY(-2px); }
.bkm-bank-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.bkm-bank-name { font-size: 16px; font-weight: 600; color: #1a1a1a; display: flex; align-items: center; gap: 8px; }
.bkm-bank-status { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 40px; text-transform: uppercase; letter-spacing: 0.5px; }
.bkm-bank-status.active { background: #e3f5eb; color: #1f6d4a; }
.bkm-bank-status.inactive { background: #f5e8e8; color: #b33c3c; }
.bkm-bank-status.paused { background: #fdf3e0; color: #a06a2a; }
.bkm-bank-details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 13px; color: #555555; margin-bottom: 12px; }
.bkm-detail-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #eaeaea; }
.bkm-detail-item .value { font-weight: 500; color: #1a1a1a; }
.bkm-bank-qr { display: flex; align-items: center; gap: 12px; margin-top: 8px; padding: 8px 12px; background: #f5f5f5; border-radius: 8px; border: 1px dashed #d0d0d0; }
.bkm-qr-placeholder { width: 44px; height: 44px; background: #ffffff; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 1px solid #d0d0d0; overflow: hidden; }
.bkm-qr-placeholder img { width: 100%; height: 100%; object-fit: cover; }
.bkm-qr-info { font-size: 13px; color: #555555; }
.bkm-qr-info .upi-id { font-weight: 600; color: #1a1a1a; display: block; margin-top: 2px; }
.bkm-role-assignments { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.bkm-role-tag { font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 30px; background: #eaeaea; color: #555555; text-transform: uppercase; }
.bkm-role-tag.super-admin { background: #d9e3ff; color: #103999; }
.bkm-role-tag.admin { background: #ddeefe; color: #0f5b8a; }
.bkm-role-tag.broker { background: #e0f0ea; color: #116b4a; }
.bkm-role-tag.sub-broker { background: #f0ece5; color: #8a6f3f; }
.bkm-role-tag.user { background: #f0f3f8; color: #39526e; }
.bkm-bank-rotation { background: #f9f9f9; border-radius: 8px; padding: 10px 12px; margin-top: 12px; border-left: 3px solid #1a1a1a; }
.bkm-rotation-label { font-weight: 600; color: #555555; text-transform: uppercase; font-size: 11px; margin-bottom: 4px; }
.bkm-rotation-details { display: flex; gap: 8px; flex-wrap: wrap; }
.bkm-rotation-details span { background: #ffffff; padding: 4px 12px; border-radius: 30px; border: 1px solid #d0d0d0; font-size: 12px; }
.bkm-bank-actions { display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; }
.bkm-bank-actions button { background: #f5f5f5; border: 1px solid #eaeaea; cursor: pointer; font-size: 12px; font-weight: 500; color: #555555; padding: 6px 12px; border-radius: 6px; transition: 0.15s; }
.bkm-bank-actions button:hover { background: #eaeaea; color: #1a1a1a; }
.bkm-bank-actions .btn-delete:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
.bkm-bank-actions .btn-edit:hover { background: #e0f2fe; color: #0284c7; border-color: #7dd3fc; }
.bkm-bank-progress { margin-top: 12px; background: #eaeaea; border-radius: 6px; height: 4px; overflow: hidden; }
.bkm-bank-progress .progress-bar { height: 100%; border-radius: 6px; transition: 0.3s; }
.bkm-bank-progress .progress-bar.green { background: #1f6d4a; }
.bkm-bank-progress .progress-bar.red { background: #dc2626; }

.bkm-modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 1000; justify-content: center; align-items: center; }
.bkm-modal-overlay.active { display: flex; }
.bkm-modal-box { background: #ffffff; padding: 24px 32px; max-width: 600px; width: 95%; border-radius: 12px; box-shadow: 0 24px 60px rgba(0,0,0,0.15); max-height: 90vh; overflow-y: auto; position: relative; }
.bkm-modal-close { position: absolute; top: 16px; right: 20px; background: none; border: none; font-size: 24px; color: #555555; cursor: pointer; padding: 4px; line-height: 1; }
.bkm-modal-close:hover { color: #1a1a1a; }
.bkm-modal-box h3 { font-size: 20px; font-weight: 600; margin-bottom: 4px; color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; }
.bkm-modal-sub { font-size: 14px; color: #555555; margin-bottom: 20px; }
.bkm-form-group { margin-bottom: 16px; }
.bkm-form-group label { font-size: 13px; font-weight: 600; color: #1a1a1a; display: block; margin-bottom: 6px; }
.bkm-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.bkm-modal-box input, .bkm-modal-box select { width: 100%; padding: 10px 14px; border: 1px solid #d0d0d0; font-size: 14px; border-radius: 8px; outline: none; transition: 0.2s; }
.bkm-modal-box input:focus, .bkm-modal-box select:focus { border-color: #1a1a1a; box-shadow: 0 0 0 3px rgba(0,0,0,0.05); }
.bkm-modal-box input[type="file"] { padding: 6px; font-size: 13px; }
.bkm-radio-group, .bkm-checkbox-group { display: flex; gap: 8px; flex-wrap: wrap; padding: 4px 0; }
.bkm-radio-group label, .bkm-checkbox-group label { display: flex; align-items: center; gap: 6px; font-weight: 500; font-size: 13px; cursor: pointer; padding: 6px 12px; background: #f5f5f5; border-radius: 40px; border: 1px solid #d0d0d0; transition: 0.15s; }
.bkm-radio-group label:hover, .bkm-checkbox-group label:hover { background: #eaeaea; }
.bkm-modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eaeaea; }
.bkm-modal-actions button { padding: 10px 24px; font-size: 14px; font-weight: 600; border-radius: 40px; cursor: pointer; transition: 0.2s; }
.bkm-btn-cancel { background: #f5f5f5; border: 1px solid #d0d0d0; color: #1a1a1a; }
.bkm-btn-cancel:hover { background: #eaeaea; }
.bkm-btn-save { background: #1a1a1a; border: none; color: white; }
.bkm-btn-save:hover { background: #2d2d2d; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.bkm-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.bkm-footer-note { margin-top: 16px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #eaeaea; padding-top: 12px; }

@media (max-width: 768px) {
  .bkm-form-row { grid-template-columns: 1fr; gap: 12px; }
}
`;

// Simple regex replace to overwrite the previously injected styles
let modifiedCss = css;
const startIndex = modifiedCss.indexOf('/* ===== BANK MANAGEMENT PAGE (Light Theme) ===== */');
const endIndex = modifiedCss.indexOf('/* ===== BANK MANAGEMENT PAGE (Light Theme) ===== */', startIndex + 1);

// We need to replace the old block completely. If we can't find exact bounds, we will just 
// replace the entire file content from the old injection if it was a block.
// Since we used `.adm-script-list {` as a marker last time and just prepended.
const markerText = '/* ===== BANK MANAGEMENT PAGE (Light Theme) ===== */';
if (css.includes(markerText)) {
   // Split and replace
   const parts = css.split(markerText);
   // parts[0] is everything before
   // parts[1] is the old css body up to next marker
   // It might be easier to just overwrite everything before `.adm-script-list {` since we injected there.
}

// Let's do a cleaner replacement. 
const oldBlockStart = '/* ===== BANK MANAGEMENT PAGE (Light Theme) ===== */';
const newBlockStart = '/* ===== BANK MANAGEMENT PAGE (Light Theme - Scaled Up) ===== */';

if (css.includes(oldBlockStart)) {
    const startIdx = css.indexOf(oldBlockStart);
    // Find the end of the block. It was injected right before '.adm-script-list {'
    const endIdx = css.indexOf('.adm-script-list {', startIdx);
    if (endIdx !== -1) {
        css = css.substring(0, startIdx) + bkmCSS + '\n' + css.substring(endIdx);
        fs.writeFileSync('C:/Users/Daksh/OneDrive/Desktop/New folder/marginapexx/app/admin-layout.css', css);
        console.log('Scaled up Bank Management CSS injected successfully.');
    }
} else if (css.includes(newBlockStart)) {
    const startIdx = css.indexOf(newBlockStart);
    const endIdx = css.indexOf('.adm-script-list {', startIdx);
    if (endIdx !== -1) {
        css = css.substring(0, startIdx) + bkmCSS + '\n' + css.substring(endIdx);
        fs.writeFileSync('C:/Users/Daksh/OneDrive/Desktop/New folder/marginapexx/app/admin-layout.css', css);
        console.log('Re-Scaled up Bank Management CSS injected successfully.');
    }
} else {
    // Just inject before .adm-script-list { again
    const idx = css.indexOf('.adm-script-list {');
    if (idx !== -1) {
      css = css.substring(0, idx) + bkmCSS + '\n' + css.substring(idx);
      fs.writeFileSync('C:/Users/Daksh/OneDrive/Desktop/New folder/marginapexx/app/admin-layout.css', css);
      console.log('Bank Management CSS injected successfully (New).');
    }
}
