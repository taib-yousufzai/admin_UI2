const fs = require('fs');
let css = fs.readFileSync('C:/Users/Daksh/OneDrive/Desktop/New folder/marginapexx/app/admin-layout.css', 'utf8');

const bkmCSS = `
/* ===== BANK MANAGEMENT PAGE (Light Theme) ===== */
.bkm-dashboard {
  font-family: 'Inter', sans-serif;
  color: #1a1a1a;
}

.bkm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 2px solid #1a1a1a;
}
.bkm-header h1 { font-weight: 700; font-size: 24px; letter-spacing: -0.3px; color: #1a1a1a; margin: 0; }
.bkm-header h1 span { color: #888888; font-weight: 300; }

.bkm-super-admin-icon {
  display: flex; align-items: center; gap: 5px; background: #1a1a1a;
  padding: 5px 16px 5px 12px; border-radius: 60px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid rgba(255,255,255,0.06);
  cursor: default;
}
.bkm-icon-wrapper {
  width: 30px; height: 30px; background: rgba(255,255,255,0.10); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.10);
}
.bkm-icon-wrapper svg { width: 16px; height: 16px; fill: white; opacity: 0.9; }
.bkm-label-text { color: white; font-weight: 600; font-size: 12px; letter-spacing: 0.2px; opacity: 0.95; }
.bkm-role-sub { font-weight: 400; font-size: 8px; opacity: 0.6; display: block; letter-spacing: 0.3px; margin-top: -1px; }

.bkm-action-row {
  display: flex; flex-wrap: nowrap; align-items: center; gap: 0.5rem;
  background: #ffffff; padding: 0.4rem 1rem; border-radius: 60px;
  border: 1px solid rgba(0,0,0,0.04); margin-bottom: 0.6rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.02);
  width: 100%;
}
.bkm-action-row .left-group { display: flex; align-items: center; gap: 0.3rem; flex: 1; min-width: 0; overflow: hidden; }
.bkm-action-row .right-group { display: flex; align-items: center; gap: 0.2rem; flex-shrink: 0; }

.bkm-filter-label { font-size: 0.6rem; font-weight: 500; color: #555555; white-space: nowrap; }

.bkm-dropdown-wrapper { position: relative; display: inline-block; flex: 1; min-width: 80px; max-width: 220px; }
.bkm-dropdown-btn {
  background: #f5f5f5; border: 1px solid #d0d0d0; border-radius: 60px;
  padding: 0.2rem 0.9rem 0.2rem 1.1rem; font-size: 0.75rem; font-weight: 500;
  color: #1a1a1a; cursor: pointer; display: flex; align-items: center; gap: 0.2rem;
  transition: 0.2s; white-space: nowrap; width: 100%; justify-content: space-between;
  min-height: 28px;
}
.bkm-dropdown-btn:hover { border-color: #1a1a1a; background: #eaeaea; }
.bkm-dropdown-menu {
  position: absolute; top: calc(100% + 3px); left: 0; background: #ffffff;
  border: 1px solid #d0d0d0; border-radius: 6px; box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  min-width: 120px; display: none; overflow: hidden; z-index: 100; max-height: 200px; overflow-y: auto;
}
.bkm-dropdown-menu.open { display: block; }
.bkm-dropdown-menu .item {
  padding: 0.25rem 0.6rem; font-size: 0.55rem; color: #1a1a1a; cursor: pointer;
  transition: 0.1s; border-bottom: 1px solid #eaeaea;
}
.bkm-dropdown-menu .item:hover { background: #f5f5f5; }

.bkm-btn-add {
  background: #1a1a1a; border: none; color: #ffffff; padding: 0.2rem 1.2rem;
  border-radius: 60px; font-weight: 500; font-size: 0.75rem; cursor: pointer;
  transition: 0.2s; white-space: nowrap; min-height: 28px; min-width: 100px;
  display: flex; align-items: center; justify-content: center;
}
.bkm-btn-add:hover { background: #2d2d2d; transform: scale(1.02); }

.bkm-section-title {
  font-size: 12px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px;
  padding-bottom: 3px; border-bottom: 1px solid #eaeaea;
}
.bkm-badge-count { font-size: 0.5rem; font-weight: 500; color: #555555; margin-left: 0.2rem; }

.bkm-deposit-summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.4rem; margin-bottom: 0.6rem; }
.bkm-deposit-summary-card {
  background: #ffffff; border-radius: 6px; border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 2px 8px rgba(0,0,0,0.02); padding: 0.35rem 0.6rem;
  display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.15s;
}
.bkm-deposit-summary-card:hover { background: #f5f5f5; }
.bkm-deposit-summary-card .bank-name { font-size: 0.55rem; font-weight: 500; color: #1a1a1a; }
.bkm-deposit-summary-card .deposit-amount { font-size: 0.55rem; font-weight: 600; color: #1f6d4a; }

.bkm-bank-txn-section {
  margin-top: 0.4rem; margin-bottom: 0.4rem; background: #ffffff;
  border-radius: 10px; border: 1px solid rgba(0,0,0,0.04); box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  overflow: hidden;
}
.bkm-bank-txn-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.3rem 0.5rem; background: #f5f5f5; border-bottom: 1px solid #eaeaea;
  cursor: pointer; transition: 0.15s;
}
.bkm-bank-txn-header:hover { background: #eaeaea; }
.bkm-bank-txn-header .bank-name { font-weight: 600; font-size: 0.7rem; color: #1a1a1a; display: flex; align-items: center; gap: 0.3rem; }
.bkm-bank-txn-header .bank-txn-count { font-size: 0.45rem; color: #555555; background: #d0d0d0; padding: 0.05rem 0.3rem; border-radius: 30px; }
.bkm-bank-txn-header .bank-txn-total { font-size: 0.5rem; font-weight: 600; color: #1f6d4a; }
.bkm-bank-txn-body { max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.3s ease, opacity 0.25s ease; }
.bkm-bank-txn-body.open { max-height: 600px; opacity: 1; overflow-y: auto; }
.bkm-bank-txn-body table { width: 100%; border-collapse: collapse; font-size: 0.55rem; }
.bkm-bank-txn-body th { text-align: left; padding: 0.15rem 0.25rem; background: #f5f5f5; color: #555555; font-weight: 600; font-size: 0.4rem; text-transform: uppercase; border-bottom: 1px solid #d0d0d0; }
.bkm-bank-txn-body td { padding: 0.15rem 0.25rem; border-bottom: 1px solid #eaeaea; color: #1a1a1a; }
.bkm-bank-txn-body tr:hover td { background: #f5f5f5; }
.bkm-tx-type.credit { color: #1f6d4a; font-weight: 600; }
.bkm-tx-type.rotation { color: #1a3a5a; font-weight: 600; }
.bkm-tx-status { font-size: 0.35rem; font-weight: 600; padding: 0.04rem 0.3rem; border-radius: 40px; }
.bkm-tx-status.success { background: #e3f5eb; color: #1f6d4a; }
.bkm-tx-status.failed { background: #f5e8e8; color: #b33c3c; }
.bkm-tx-status.pending { background: #fdf3e0; color: #a06a2a; }
.bkm-btn-change-bank { background: #f5f5f5; border: 1px solid #d0d0d0; border-radius: 30px; padding: 0.04rem 0.35rem; font-size: 0.4rem; font-weight: 500; color: #1a1a1a; cursor: pointer; }

.bkm-banks-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 0.8rem; }
.bkm-bank-card {
  background: #ffffff; border-radius: 10px; border: 1px solid rgba(0,0,0,0.04);
  box-shadow: 0 2px 8px rgba(0,0,0,0.02); padding: 0.5rem 0.6rem; transition: all 0.2s; position: relative;
}
.bkm-bank-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
.bkm-bank-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem; }
.bkm-bank-name { font-size: 0.7rem; font-weight: 600; color: #1a1a1a; display: flex; align-items: center; gap: 0.3rem; }
.bkm-bank-status { font-size: 0.4rem; font-weight: 600; padding: 0.06rem 0.4rem; border-radius: 40px; }
.bkm-bank-status.active { background: #e3f5eb; color: #1f6d4a; }
.bkm-bank-status.inactive { background: #f5e8e8; color: #b33c3c; }
.bkm-bank-status.paused { background: #fdf3e0; color: #a06a2a; }
.bkm-bank-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.1rem 0.3rem; font-size: 0.5rem; color: #555555; margin-bottom: 0.2rem; }
.bkm-detail-item { display: flex; justify-content: space-between; padding: 0.05rem 0; border-bottom: 1px dashed #eaeaea; }
.bkm-detail-item .value { font-weight: 500; color: #1a1a1a; }
.bkm-bank-qr { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.15rem; padding: 0.15rem 0.3rem; background: #f5f5f5; border-radius: 6px; border: 1px dashed #d0d0d0; }
.bkm-qr-placeholder { width: 28px; height: 28px; background: #ffffff; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.45rem; border: 1px solid #d0d0d0; }
.bkm-qr-info { font-size: 0.45rem; color: #555555; }
.bkm-qr-info .upi-id { font-weight: 600; color: #1a1a1a; }
.bkm-role-assignments { display: flex; flex-wrap: wrap; gap: 0.15rem; margin-top: 0.15rem; }
.bkm-role-tag { font-size: 0.35rem; font-weight: 600; padding: 0.04rem 0.3rem; border-radius: 30px; background: #eaeaea; color: #555555; text-transform: uppercase; }
.bkm-role-tag.super-admin { background: #d9e3ff; color: #103999; }
.bkm-role-tag.admin { background: #ddeefe; color: #0f5b8a; }
.bkm-role-tag.broker { background: #e0f0ea; color: #116b4a; }
.bkm-role-tag.sub-broker { background: #f0ece5; color: #8a6f3f; }
.bkm-role-tag.user { background: #f0f3f8; color: #39526e; }
.bkm-bank-rotation { background: #f5f5f5; border-radius: 6px; padding: 0.2rem 0.4rem; margin-top: 0.2rem; border-left: 2px solid #1a1a1a; }
.bkm-rotation-label { font-weight: 600; color: #555555; text-transform: uppercase; font-size: 0.35rem; }
.bkm-rotation-details { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.05rem; }
.bkm-rotation-details span { background: #ffffff; padding: 0.04rem 0.3rem; border-radius: 30px; border: 1px solid #d0d0d0; font-size: 0.45rem; }
.bkm-bank-actions { display: flex; gap: 0.2rem; margin-top: 0.3rem; justify-content: flex-end; }
.bkm-bank-actions button { background: none; border: none; cursor: pointer; font-size: 0.5rem; color: #555555; padding: 0.08rem 0.25rem; border-radius: 4px; }
.bkm-bank-actions button:hover { background: #f5f5f5; color: #1a1a1a; }
.bkm-bank-progress { margin-top: 0.2rem; background: #eaeaea; border-radius: 4px; height: 3px; overflow: hidden; }
.bkm-bank-progress .progress-bar { height: 100%; border-radius: 4px; }

.bkm-modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.10); backdrop-filter: blur(2px); z-index: 1000; justify-content: center; align-items: center; }
.bkm-modal-overlay.active { display: flex; }
.bkm-modal-box { background: #ffffff; padding: 16px; max-width: 480px; width: 92%; border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.08); max-height: 92vh; overflow-y: auto; position: relative; }
.bkm-modal-close { position: absolute; top: 12px; right: 16px; background: none; border: none; font-size: 18px; color: #555555; cursor: pointer; padding: 0 4px; }
.bkm-modal-box h3 { font-size: 15px; font-weight: 600; margin-bottom: 3px; color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 5px; padding-right: 30px; }
.bkm-modal-sub { font-size: 10px; color: #555555; margin-bottom: 12px; }
.bkm-form-group { margin-bottom: 8px; }
.bkm-form-group label { font-size: 9px; font-weight: 600; color: #1a1a1a; display: block; margin-bottom: 2px; }
.bkm-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.bkm-modal-box input, .bkm-modal-box select { width: 100%; padding: 5px 8px; border: 1px solid #d0d0d0; font-size: 11px; border-radius: 6px; }
.bkm-modal-box input[type="file"] { padding: 3px; font-size: 10px; }
.bkm-radio-group, .bkm-checkbox-group { display: flex; gap: 4px; flex-wrap: wrap; padding: 3px 0; }
.bkm-radio-group label, .bkm-checkbox-group label { display: flex; align-items: center; gap: 3px; font-weight: 400; font-size: 8px; cursor: pointer; padding: 2px 6px; background: #f5f5f5; border-radius: 30px; border: 1px solid #d0d0d0; }
.bkm-modal-actions { display: flex; gap: 6px; justify-content: flex-end; margin-top: 12px; }
.bkm-modal-actions button { padding: 4px 14px; font-size: 10px; font-weight: 500; border-radius: 40px; cursor: pointer; }
.bkm-btn-cancel { background: #f5f5f5; border: 1px solid #d0d0d0; color: #1a1a1a; }
.bkm-btn-save { background: #1a1a1a; border: none; color: white; }
.bkm-footer-note { margin-top: 8px; text-align: center; font-size: 7px; color: #555555; border-top: 1px solid #eaeaea; padding-top: 6px; }

@media (max-width: 768px) {
  .bkm-deposit-summary-grid { grid-template-columns: 1fr 1fr; }
  .bkm-banks-grid { grid-template-columns: 1fr; }
  .bkm-form-row { grid-template-columns: 1fr; }
}
`;

const marker = '.adm-script-list {';
const idx = css.indexOf(marker);
if (idx !== -1) {
  css = css.substring(0, idx) + bkmCSS + '\n' + css.substring(idx);
  fs.writeFileSync('C:/Users/Daksh/OneDrive/Desktop/New folder/marginapexx/app/admin-layout.css', css);
  console.log('Bank Management CSS injected successfully.');
} else {
  console.log('Marker not found');
}
