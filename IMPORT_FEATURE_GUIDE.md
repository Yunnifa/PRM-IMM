# Panduan Implementasi Fitur Import Excel

Dokumentasi lengkap tentang fitur import data dari file Excel yang digunakan dalam project PRM-IMM. Panduan ini dapat digunakan untuk mengimplementasikan fitur serupa pada project lain.

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Dependencies](#2-dependencies)
3. [Struktur State](#3-struktur-state)
4. [Fitur Download Template](#4-fitur-download-template)
5. [Fitur Upload & Parsing](#5-fitur-upload--parsing)
6. [Validasi Data](#6-validasi-data)
7. [Modal Import UI](#7-modal-import-ui)
8. [Error Handling](#8-error-handling)
9. [Implementasi Lengkap](#9-implementasi-lengkap)

---

## 1. Overview

Fitur import ini memungkinkan user untuk:
- Download template Excel dengan dropdown validation
- Upload file Excel (.xlsx, .xls)
- Validasi data otomatis sebelum import
- Menampilkan progress upload
- Menampilkan detail error per baris

### Alur Kerja

```
Download Template → Isi Data → Upload File → Validasi → Feedback Hasil
```

---

## 2. Dependencies

### NPM Packages

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",      // Parsing file Excel
    "exceljs": "^4.4.0"     // Generate template dengan dropdown
  }
}
```

### Install

```bash
npm install xlsx exceljs
```

### Import Statement

```typescript
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
```

---

## 3. Struktur State

### State untuk Import Modal

```typescript
// Modal visibility
const [showImportModal, setShowImportModal] = useState(false);

// File yang dipilih
const [selectedFile, setSelectedFile] = useState<File | null>(null);

// Status upload
const [uploading, setUploading] = useState(false);

// Progress (0-100)
const [uploadProgress, setUploadProgress] = useState(0);

// Hasil upload
const [uploadResult, setUploadResult] = useState<{
  successCount: number;
  errorCount: number;
  totalRows: number;
  errors: Array<{ row: number; message: string; field?: string }>;
} | null>(null);

// Drag & drop state
const [dragOver, setDragOver] = useState(false);

// Toggle tampilan error detail
const [showErrors, setShowErrors] = useState(false);
```

### Interface Upload Result

```typescript
interface UploadResult {
  successCount: number;    // Jumlah baris berhasil
  errorCount: number;      // Jumlah baris error
  totalRows: number;       // Total baris di file
  errors: Array<{
    row: number;           // Nomor baris (1-based)
    message: string;       // Pesan error
    field?: string;        // Field yang error (opsional)
  }>;
}
```

---

## 4. Fitur Download Template

### Fungsi Download Template dengan Dropdown

```typescript
const downloadTemplate = async () => {
  try {
    // 1. Create workbook baru
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data User');

    // 2. Define columns
    worksheet.columns = [
      { header: 'Nama Lengkap', key: 'fullName', width: 25 },
      { header: 'Nomor Telepon', key: 'whatsapp', width: 18 },
      { header: 'Tanggal Lahir', key: 'birthDate', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Departemen', key: 'department', width: 25 },
      { header: 'Role', key: 'role', width: 20 },
    ];

    // 3. Style header row
    worksheet.getRow(1).font = { bold: true, size: 11 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }  // Biru
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 25;

    // 4. Add example data rows
    worksheet.addRow({
      fullName: 'John Doe',
      whatsapp: '081234567890',
      birthDate: '1990-01-15',
      email: 'john.doe@company.com',
      department: 'IT Department',
      role: 'user'
    });
    worksheet.addRow({
      fullName: 'Jane Smith',
      whatsapp: '081234567891',
      birthDate: '1992-05-20',
      email: 'jane.smith@company.com',
      department: 'HR Department',
      role: 'head_dept'
    });

    // 5. Create hidden sheet untuk dropdown values
    const hiddenSheet = workbook.addWorksheet('DropdownData');
    hiddenSheet.state = 'hidden';  // Hide sheet ini
    
    // Data untuk dropdown Departemen
    const departmentNames = ['IT Department', 'HR Department', 'Finance', 'Marketing'];
    departmentNames.forEach((dept, index) => {
      hiddenSheet.getCell(`A${index + 1}`).value = dept;
    });
    
    // Data untuk dropdown Role
    const roleOptions = ['user', 'admin', 'head_dept', 'ga'];
    roleOptions.forEach((role, index) => {
      hiddenSheet.getCell(`B${index + 1}`).value = role;
    });

    // 6. Add data validation (dropdown) untuk 500 rows
    for (let i = 2; i <= 500; i++) {
      // Dropdown untuk Departemen (kolom E)
      worksheet.getCell(`E${i}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`DropdownData!$A$1:$A$${departmentNames.length}`]
      };

      // Dropdown untuk Role (kolom F)
      worksheet.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`DropdownData!$B$1:$B$${roleOptions.length}`]
      };
    }

    // 7. Add instructions sheet
    const instructionsSheet = workbook.addWorksheet('Instruksi');
    instructionsSheet.columns = [
      { header: 'Kolom', key: 'column', width: 20 },
      { header: 'Keterangan', key: 'description', width: 60 },
      { header: 'Wajib?', key: 'required', width: 10 },
    ];

    instructionsSheet.getRow(1).font = { bold: true };
    instructionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }  // Hijau
    };
    instructionsSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };

    instructionsSheet.addRows([
      { column: 'Nama Lengkap', description: 'Nama lengkap user', required: 'Ya' },
      { column: 'Nomor Telepon', description: 'Nomor WhatsApp (10-15 digit angka)', required: 'Ya' },
      { column: 'Tanggal Lahir', description: 'Format: YYYY-MM-DD (contoh: 1990-01-15)', required: 'Ya' },
      { column: 'Email', description: 'Email valid dengan format @', required: 'Ya' },
      { column: 'Departemen', description: 'Pilih dari dropdown', required: 'Ya' },
      { column: 'Role', description: 'Pilih dari dropdown: user, admin, head_dept, ga', required: 'Ya' },
    ]);

    // 8. Generate dan download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Import_User.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error generating template:', error);
    alert('Gagal membuat template. Silakan coba lagi.');
  }
};
```

---

## 5. Fitur Upload & Parsing

### Handler File Input

```typescript
const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validasi file type
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    alert('File harus berformat Excel (.xlsx atau .xls)');
    event.target.value = '';
    return;
  }

  // Validasi file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('Ukuran file maksimal 10MB');
    event.target.value = '';
    return;
  }

  setSelectedFile(file);
  setUploadResult(null);
  setShowImportModal(true);
  event.target.value = '';  // Reset input untuk allow upload file sama
};
```

### Handler Drag & Drop

```typescript
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  setDragOver(true);
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  setDragOver(false);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setDragOver(false);
  
  const file = e.dataTransfer.files[0];
  if (file && file.name.match(/\.(xlsx|xls)$/i)) {
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file maksimal 10MB');
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
  } else {
    alert('File harus berformat Excel (.xlsx atau .xls)');
  }
};
```

### Fungsi Process Import

```typescript
const processImport = () => {
  if (!selectedFile) return;

  setUploading(true);
  setUploadProgress(0);
  setUploadResult(null);

  const reader = new FileReader();
  
  // Progress tracking
  reader.onprogress = (e) => {
    if (e.lengthComputable) {
      setUploadProgress(Math.round((e.loaded / e.total) * 50));
    }
  };

  reader.onload = (e) => {
    try {
      setUploadProgress(50);
      
      // Parse Excel file
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      setUploadProgress(60);

      // Validasi file kosong
      if (jsonData.length === 0) {
        setUploadResult({
          successCount: 0,
          errorCount: 0,
          totalRows: 0,
          errors: [{ row: 0, message: 'File Excel kosong!' }]
        });
        setUploading(false);
        return;
      }

      // Validasi kolom
      const firstRow = jsonData[0];
      const requiredColumns = ['Nama Lengkap', 'Nomor Telepon', 'Tanggal Lahir', 'Email', 'Departemen', 'Role'];
      const hasAllColumns = requiredColumns.every(col => col in firstRow);

      if (!hasAllColumns) {
        setUploadResult({
          successCount: 0,
          errorCount: 0,
          totalRows: 0,
          errors: [{ 
            row: 0, 
            message: `Format file tidak sesuai template! Kolom yang diperlukan: ${requiredColumns.join(', ')}` 
          }]
        });
        setUploading(false);
        return;
      }

      setUploadProgress(70);

      // Proses validasi per baris
      const importedData: any[] = [];
      const errors: Array<{ row: number; message: string; field?: string }> = [];

      jsonData.forEach((row, index) => {
        const rowNum = index + 2;  // +2 karena header di row 1
        
        // ... validasi per field (lihat bagian Validasi Data)
        
        // Jika valid, tambahkan ke importedData
        importedData.push({
          // ... mapped data
        });
      });

      setUploadProgress(90);

      // Update state dengan data yang berhasil
      if (importedData.length > 0) {
        // Kirim ke backend atau update local state
        // setUsers([...users, ...importedData]);
      }

      setUploadProgress(100);
      setUploadResult({
        successCount: importedData.length,
        errorCount: errors.length,
        totalRows: jsonData.length,
        errors
      });

    } catch (error) {
      setUploadResult({
        successCount: 0,
        errorCount: 0,
        totalRows: 0,
        errors: [{ row: 0, message: 'Error membaca file Excel! Pastikan file sesuai dengan template.' }]
      });
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  reader.readAsBinaryString(selectedFile);
};
```

---

## 6. Validasi Data

### Contoh Validasi Lengkap Per Field

```typescript
jsonData.forEach((row, index) => {
  const rowNum = index + 2;  // Header di row 1
  
  // Extract data
  const namaLengkap = row['Nama Lengkap']?.toString().trim();
  const nomorTelepon = row['Nomor Telepon']?.toString().trim();
  const tanggalLahir = row['Tanggal Lahir']?.toString().trim();
  const email = row['Email']?.toString().trim();
  const departemen = row['Departemen']?.toString().trim();
  const role = row['Role']?.toString().trim().toLowerCase();

  // 1. Validasi field wajib
  if (!namaLengkap || !nomorTelepon || !tanggalLahir || !email || !departemen || !role) {
    const missingField = !namaLengkap ? 'Nama Lengkap' : 
                         !nomorTelepon ? 'Nomor Telepon' : 
                         !tanggalLahir ? 'Tanggal Lahir' :
                         !email ? 'Email' : 
                         !departemen ? 'Departemen' : 'Role';
    errors.push({ row: rowNum, message: 'Data tidak lengkap', field: missingField });
    return;  // Skip ke baris berikutnya
  }

  // 2. Validasi format email
  if (!email.includes('@') || !email.includes('.')) {
    errors.push({ row: rowNum, message: 'Format email tidak valid', field: 'Email' });
    return;
  }

  // 3. Validasi nomor telepon (10-15 digit)
  if (!/^\d{10,15}$/.test(nomorTelepon.replace(/\s/g, ''))) {
    errors.push({ row: rowNum, message: 'Nomor telepon harus 10-15 digit angka', field: 'Nomor Telepon' });
    return;
  }

  // 4. Validasi dan konversi tanggal lahir
  let formattedBirthDate = tanggalLahir;
  if (!tanggalLahir.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Coba parse Excel date number
    if (!isNaN(Number(tanggalLahir))) {
      const excelDate = XLSX.SSF.parse_date_code(Number(tanggalLahir));
      formattedBirthDate = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    } 
    // Konversi dari DD/MM/YYYY ke YYYY-MM-DD
    else if (tanggalLahir.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const parts = tanggalLahir.split('/');
      formattedBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      errors.push({ row: rowNum, message: 'Format tanggal lahir tidak valid (gunakan YYYY-MM-DD)', field: 'Tanggal Lahir' });
      return;
    }
  }

  // 5. Validasi departemen ada di master data
  const validDepartments = ['IT Department', 'HR Department', 'Finance'];
  if (!validDepartments.includes(departemen)) {
    errors.push({ row: rowNum, message: `Departemen "${departemen}" tidak ditemukan di database`, field: 'Departemen' });
    return;
  }

  // 6. Validasi role
  const validRoles = ['user', 'admin', 'head_dept', 'ga'];
  if (!validRoles.includes(role)) {
    errors.push({ row: rowNum, message: `Role harus salah satu dari: ${validRoles.join(', ')}`, field: 'Role' });
    return;
  }

  // Jika semua validasi pass, tambahkan ke array
  importedData.push({
    fullName: namaLengkap,
    email,
    whatsapp: nomorTelepon.replace(/\s/g, ''),
    birthDate: formattedBirthDate,
    department: departemen,
    role,
    username: email.split('@')[0],  // Auto-generate username
    createdAt: new Date().toISOString()
  });
});
```

---

## 7. Modal Import UI

### Struktur Modal

```tsx
{showImportModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Import Data User</h3>
          <button
            onClick={closeImportModal}
            className="text-gray-400 hover:text-gray-600"
            disabled={uploading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        
        {/* Instructions Box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">📋 Instruksi Upload</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Download template terlebih dahulu</li>
            <li>Isi semua kolom wajib</li>
            <li>Gunakan dropdown untuk Departemen dan Role</li>
            <li>Data yang error akan dilaporkan dengan detail</li>
          </ul>
        </div>

        {/* Download Template Button */}
        <div className="mb-6">
          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            disabled={uploading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Template
          </button>
        </div>

        {/* File Upload Area (Drag & Drop) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload File Excel
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('import-file-input')?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              id="import-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              disabled={uploading}
            />
            
            {!selectedFile ? (
              <>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Klik atau drag & drop file Excel di sini
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Format: .xlsx atau .xls (Maks. 10MB)
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Memproses...</span>
              <span className="text-sm text-gray-500">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className="mb-6">
            <div className={`p-4 rounded-lg border ${
              uploadResult.errorCount === 0 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                {uploadResult.errorCount === 0 ? (
                  <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Import Selesai</h4>
                  <div className="text-sm space-y-1">
                    <p>✅ Berhasil: <strong>{uploadResult.successCount}</strong> dari {uploadResult.totalRows} baris</p>
                    {uploadResult.errorCount > 0 && (
                      <p>⚠️ Error: <strong>{uploadResult.errorCount}</strong> baris dilewati</p>
                    )}
                  </div>

                  {/* Error Details Toggle */}
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowErrors(!showErrors)}
                        className="text-sm font-medium text-yellow-700 hover:text-yellow-800 flex items-center gap-1"
                      >
                        {showErrors ? 'Sembunyikan' : 'Lihat'} Detail Error
                        <svg className={`w-4 h-4 transition-transform ${showErrors ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {showErrors && (
                        <div className="mt-2 max-h-48 overflow-y-auto">
                          <div className="bg-white rounded border border-yellow-300 divide-y divide-yellow-200">
                            {uploadResult.errors.slice(0, 20).map((error, idx) => (
                              <div key={idx} className="px-3 py-2 text-xs">
                                <span className="font-semibold">Baris {error.row}:</span>
                                <span className="ml-1">{error.message}</span>
                                {error.field && (
                                  <span className="text-gray-500 ml-1">(Field: {error.field})</span>
                                )}
                              </div>
                            ))}
                            {uploadResult.errors.length > 20 && (
                              <div className="px-3 py-2 text-xs text-gray-600 italic">
                                ... dan {uploadResult.errors.length - 20} error lainnya
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-lg flex justify-end gap-3">
        <button
          onClick={closeImportModal}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={uploading}
        >
          {uploadResult ? 'Tutup' : 'Batal'}
        </button>
        
        {selectedFile && !uploadResult && (
          <button
            onClick={processImport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={uploading || !selectedFile}
          >
            {uploading ? 'Memproses...' : 'Upload Data'}
          </button>
        )}
        
        {uploadResult && (
          <button
            onClick={resetImport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload Lagi
          </button>
        )}
      </div>
    </div>
  </div>
)}
```

---

## 8. Error Handling

### Utility Functions

```typescript
// Format file size untuk display
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

// Reset state import
const resetImport = () => {
  setSelectedFile(null);
  setUploading(false);
  setUploadProgress(0);
  setUploadResult(null);
  setShowErrors(false);
};

// Close modal dan reset
const closeImportModal = () => {
  setShowImportModal(false);
  setTimeout(resetImport, 300);  // Delay untuk animasi close
};
```

### Pattern Error Messages

| Kondisi | Pesan Error |
|---------|-------------|
| File kosong | "File Excel kosong!" |
| Kolom tidak sesuai | "Format file tidak sesuai template! Kolom yang diperlukan: ..." |
| Field wajib kosong | "Data tidak lengkap" |
| Email tidak valid | "Format email tidak valid" |
| Nomor telepon tidak valid | "Nomor telepon harus 10-15 digit angka" |
| Tanggal tidak valid | "Format tanggal lahir tidak valid (gunakan YYYY-MM-DD)" |
| Referensi tidak ditemukan | "[Field] tidak ditemukan di database" |
| Nilai enum tidak valid | "[Field] harus salah satu dari: ..." |

---

## 9. Implementasi Lengkap

### Checklist Implementasi

Untuk mengimplementasikan fitur import di project lain:

1. **Install dependencies**
   ```bash
   npm install xlsx exceljs
   ```

2. **Definisikan state yang diperlukan** (lihat bagian 3)

3. **Sesuaikan kolom template** dengan kebutuhan project
   - Ubah `worksheet.columns`
   - Ubah dropdown values
   - Ubah validasi

4. **Sesuaikan validasi** dengan business rules

5. **Integrasikan dengan backend** (opsional)
   - Kirim data yang berhasil divalidasi ke API
   - Handle response error dari backend

6. **Copy komponen UI modal** dan sesuaikan styling

### Tips Implementasi

- **Performance**: Untuk file besar (> 1000 baris), pertimbangkan batch processing
- **UX**: Selalu tampilkan progress dan feedback yang jelas
- **Validation**: Validasi di frontend untuk UX, validasi ulang di backend untuk keamanan
- **Template**: Gunakan hidden sheet untuk dropdown agar tidak corrupt
- **Error Detail**: Tampilkan nomor baris dan field yang bermasalah

---

## Referensi

- [SheetJS (xlsx) Documentation](https://docs.sheetjs.com/)
- [ExcelJS Documentation](https://github.com/exceljs/exceljs)
- Project source: `frontend/src/components/DataUser.tsx`

---

Dokumen ini dibuat berdasarkan implementasi fitur import di project PRM-IMM dan dapat digunakan sebagai referensi untuk mengimplementasikan fitur serupa pada project lain.
