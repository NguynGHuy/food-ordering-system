// Mechanical fixture sanitization only. Never connects to or modifies a database.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const phone = id => quote(`09${String(id).padStart(8, '0')}`);

function tuples(text) {
  const rows = [];
  let row = null, start = 0, quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted && ch === '\\') { i++; continue; }
    if (ch === "'") {
      if (quoted && text[i + 1] === "'") { i++; continue; }
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (ch === '(') { row = []; start = i + 1; }
    else if (row && (ch === ',' || ch === ')')) {
      row.push(text.slice(start, i).trim());
      start = i + 1;
      if (ch === ')') { rows.push(row); row = null; }
    }
  }
  if (quoted || row) throw new Error('Invalid fixture tuples; no file written.');
  return rows;
}

export function sanitizeSql(sql) {
  const schemas = new Map();
  for (const match of sql.matchAll(/CREATE TABLE `(\w+)` \(([\s\S]*?)\r?\n\) ENGINE/g)) {
    schemas.set(match[1], [...match[2].matchAll(/^\s+`([^`]+)` /gm)].map(x => x[1]));
  }
  const targets = new Set(['taikhoan', 'khachhang', 'nhahang', 'diachi', 'donhang',
    'danhgiamonan', 'danhgianhahang', 'thongbao', 'lichsutrangthaidonhang']);
  return sql.replace(/^INSERT INTO `(\w+)` VALUES (.*);\r?$/gm, (statement, table, values) => {
    if (!targets.has(table)) return statement;
    const columns = schemas.get(table);
    if (!columns) throw new Error('Missing schema; no file written.');
    const rows = tuples(values).map(row => {
      if (row.length !== columns.length) throw new Error('Column mismatch; no file written.');
      const data = Object.fromEntries(columns.map((c, i) => [c, row[i]]));
      const set = (name, value) => { if (name in data) data[name] = value; };
      if (table === 'taikhoan') {
        set('Email', quote(`demo.account${data.MaTaiKhoan}@example.invalid`));
        // Not a password or a usable hash. Provision credentials outside source.
        set('MatKhau', quote('DEMO_RESET_REQUIRED'));
        set('SoDienThoai', phone(data.MaTaiKhoan));
        set('AnhDaiDien', 'NULL');
      } else if (table === 'khachhang') {
        set('HoTen', quote(`Khach demo ${data.MaKhachHang}`));
        set('NgaySinh', "'2000-01-01'");
      } else if (table === 'nhahang') {
        set('TenNhaHang', quote(`Nha hang demo ${data.MaNhaHang}`));
        set('MoTa', quote('Du lieu minh hoa, khong phai nha hang that.'));
        set('DiaChiQuan', quote(`Dia chi nha hang demo ${data.MaNhaHang}`));
      } else if (table === 'diachi' || table === 'donhang') {
        set('TenNguoiNhan', quote(`Khach demo ${data.MaKhachHang}`));
        set('SoDienThoaiNhan', phone(data.MaKhachHang));
        set('DiaChiCuThe', quote(`Dia chi demo ${data.MaDiaChi}`));
        set('DiaChiGiaoHang', quote(`Dia chi demo ${data.MaDiaChi}`));
        set('TenNhaHangLucDat', quote(`Nha hang demo ${data.MaNhaHang}`));
        set('GhiChu', 'NULL');
        if (data.LyDoHuy && data.LyDoHuy !== 'NULL') set('LyDoHuy', quote('Huy don demo'));
      } else if (table === 'thongbao') {
        set('TieuDe', quote('Thong bao demo'));
        set('NoiDung', quote('Du lieu thong bao minh hoa.'));
      } else if (table === 'lichsutrangthaidonhang') {
        set('GhiChu', quote('Lich su don hang demo'));
      } else {
        if (data.NoiDung !== 'NULL') set('NoiDung', quote('Danh gia demo'));
        set('HinhAnh', 'NULL');
      }
      return `(${columns.map(c => data[c]).join(',')})`;
    });
    return `INSERT INTO \`${table}\` VALUES ${rows.join(',')};`;
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = resolve('DatMonAnOnline.API/Database/Database.sql');
  const before = readFileSync(path, 'utf8');
  const after = sanitizeSql(before);
  if (process.argv.includes('--write')) {
    writeFileSync(path, after);
    console.log('Demo fixture sanitized; IDs, amounts and relationships preserved. No database accessed.');
  } else {
    const clean = before === after;
    console.log(clean ? 'PASS: demo fixture sanitized.' : 'FAIL: demo fixture requires sanitization (contents redacted).');
    process.exitCode = clean ? 0 : 1;
  }
}
