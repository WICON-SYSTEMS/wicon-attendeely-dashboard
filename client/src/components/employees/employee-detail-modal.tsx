import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, IdCard, DollarSign, Download, Edit, Upload, Printer } from "lucide-react";
import { getEmployee, normalizeQrImage } from "@/lib/employees";
import type { Employee } from "@shared/schema";
import { useEmployees } from "@/hooks/use-employees";
import { useToast } from "@/hooks/use-toast";

interface EmployeeDetailModalProps {
  open: boolean;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
  employee: Employee | null;
}

export function EmployeeDetailModal({ open, onClose, onEdit, employee }: EmployeeDetailModalProps) {
  // Backend-generated QR image string (URL or base64) after upload
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [details, setDetails] = useState<Employee | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const { uploadBiometrics, isUploadingBiometrics, uploadError } = useEmployees();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showQrLightbox, setShowQrLightbox] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printMode, setPrintMode] = useState<'full' | 'card'>('full');
  const [includeSensitive, setIncludeSensitive] = useState(true);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [multiPerPage, setMultiPerPage] = useState(false);
  const [copiesPerPage, setCopiesPerPage] = useState<number>(8);

  // Clear any previous upload state when reopening
  useEffect(() => {
    if (open) {
      setUploadFile(null);
      setQrImage(null);
    }
  }, [open]);

  // Fetch full employee details (includes salary) when modal opens
  useEffect(() => {
    const fetchDetails = async () => {
      if (!open || !employee?.employee_id) return;
      try {
        setLoadingDetails(true);
        const full = await getEmployee(employee.employee_id);
        setDetails(full);
      } catch (e) {
        // fail silently; UI will fallback to list data
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [open, employee?.employee_id]);

  // Dynamically load external script
  const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) { existing.onload = () => resolve(); resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });

  // Helper to convert image URL to base64 data URL
  const imageToDataUrl = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!url) { resolve(''); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(''); // fallback to empty if image fails
      img.src = url;
    });
  };

  const handleDownloadPdf = async () => {
    if (!employee) return;
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');

      let targetEl: HTMLElement | null = null;
      let cleanup: (() => void) | null = null;

      if (printMode === 'card') {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-99999px';
        container.style.top = '0';
        container.style.background = '#fff';
        container.style.padding = '16px';

        const qrSrc = qrImage || qrFromDetails || '';
        const photoUrl = (details as any)?.image_url || (employee as any)?.image_url || '';
        
        // Convert images to data URLs to avoid CORS issues
        const photo = await imageToDataUrl(photoUrl);
        const qrDataUrl = await imageToDataUrl(qrSrc);
        const logoDataUrl = await imageToDataUrl('/logo.png');
        
        const name = `${employee.first_name} ${employee.last_name}`;
        const code = employee.employee_code;
        const dept = employee.department;
        const position = employee.position;
        const phone = employee.phone;
        const email = employee.email;
        const salaryBlock = includeSensitive && typeof salaryNumber === 'number' ? `<div style="margin-top:6px; font-size:12px"><strong>Salary:</strong> XAF ${salaryNumber.toLocaleString()}</div>` : '';
        const brandHeader = `<div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" style="height:24px; width:auto; object-fit:contain;"/>` : ''}<div style="font-weight:700; letter-spacing:.3px;">WICON</div></div>`;
        const cardInner = `
          <style>
            .idcard { position:relative; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; width: 320px; min-height: 200px; box-shadow:0 1px 2px rgba(16,24,40,.06); }
            .idcard .header{ display:flex; gap:12px; }
            .idcard .photo{ width:64px; height:64px; border-radius:8px; overflow:hidden; background:#f1f5f9; flex:0 0 auto; }
            .idcard .photo img{ width:100%; height:100%; object-fit:cover; display:block; }
            .idcard .meta{ font-size:12px; line-height:1.3; }
            .idcard .name{ font-size:14px; font-weight:700; color:#0f172a; }
            .idcard .code{ font-size:12px; color:#475569; }
            .idcard .dept{ font-size:12px; color:#64748b; margin-top:2px; }
            .idcard .contact{ font-size:11px; color:#94a3b8; margin-top:2px; }
            .idcard .qr{ margin-top:10px; display:flex; align-items:center; justify-content:center; }
            .idcard .qr img{ width:120px; height:120px; object-fit:contain; }
            .idcard .qr-missing{ width:120px; height:120px; display:flex; align-items:center; justify-content:center; color:#64748b; border:1px dashed #cbd5e1; border-radius:8px; font-size:12px; }
            .grid{ display:grid; grid-template-columns: repeat(2, 1fr); gap:16px; }
          </style>
          ${multiPerPage ? `<div class="grid">${Array.from({length: copiesPerPage}, () => `
            <div class="idcard">${brandHeader}
              <div class="header"><div class="photo"><img src="${photo}"/></div>
                <div class="meta"><div class="name">${name}</div><div class="code">${code}</div><div class="dept">${dept} • ${position}</div><div class="contact">${phone} • ${email}</div>${salaryBlock}</div>
              </div>
              <div class="qr">${qrDataUrl ? `<img src="${qrDataUrl}"/>` : '<div class="qr-missing">QR not available</div>'}</div>
            </div>`).join('')}</div>`
          : `
            <div class="idcard">${brandHeader}
              <div class="header"><div class="photo"><img src="${photo}"/></div>
                <div class="meta"><div class="name">${name}</div><div class="code">${code}</div><div class="dept">${dept} • ${position}</div><div class="contact">${phone} • ${email}</div>${salaryBlock}</div>
              </div>
              <div class="qr">${qrDataUrl ? `<img src="${qrDataUrl}"/>` : '<div class="qr-missing">QR not available</div>'}</div>
            </div>`}
        `;
        container.innerHTML = cardInner;
        document.body.appendChild(container);
        targetEl = container;
        cleanup = () => { document.body.removeChild(container); };
      } else {
        targetEl = printRef.current;
      }

      // @ts-ignore
      const canvas = await (window as any).html2canvas(targetEl, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      // @ts-ignore
      const { jsPDF } = (window as any).jspdf;
      const format = pageSize === 'Letter' ? 'letter' : 'a4';
      const pdf = new jsPDF({ unit: 'mm', format });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight - 20) {
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      } else {
        let remainingHeight = imgHeight;
        let position = 10;
        const sliceHeight = pageHeight - 20;
        const scale = imgWidth / canvas.width;
        const sourceCanvas = canvas;
        const tmpCanvas = document.createElement('canvas');
        const ctx = tmpCanvas.getContext('2d');
        const slicePx = Math.floor((sliceHeight / scale));
        let sY = 0;
        while (remainingHeight > 0) {
          tmpCanvas.width = sourceCanvas.width;
          tmpCanvas.height = Math.min(slicePx, sourceCanvas.height - sY);
          ctx!.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
          ctx!.drawImage(sourceCanvas, 0, sY, tmpCanvas.width, tmpCanvas.height, 0, 0, tmpCanvas.width, tmpCanvas.height);
          const sliceData = tmpCanvas.toDataURL('image/png');
          if (position !== 10) pdf.addPage();
          pdf.addImage(sliceData, 'PNG', 10, 10, imgWidth, (tmpCanvas.height * imgWidth) / tmpCanvas.width);
          sY += tmpCanvas.height;
          remainingHeight -= sliceHeight;
          position += sliceHeight;
        }
      }

      pdf.save(`${employee.first_name}_${employee.last_name}_${printMode === 'card' ? 'IDCard' : 'Details'}.pdf`);
      if (cleanup) cleanup();
    } catch (e: any) {
      toast({ title: 'PDF export failed', description: e?.message || 'Could not generate PDF', variant: 'destructive' });
    }
  };

  // Fetch full employee details (includes salary) when modal opens
  useEffect(() => {
    const fetchDetails = async () => {
      if (!open || !employee?.employee_id) return;
      try {
        setLoadingDetails(true);
        const full = await getEmployee(employee.employee_id);
        setDetails(full);
      } catch (e) {
        // fail silently; UI will fallback to list data
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [open, employee?.employee_id]);

  if (!employee) return null;

  const salaryVal = (details?.salary ?? employee.salary) as unknown;
  const salaryNumber = typeof salaryVal === 'number' ? salaryVal : undefined;

  // Derive biometric status safely
  const faceRegistered =
    details?.biometric_status?.facial_biometrics_registered ?? undefined;
  const qrGenerated =
    details?.biometric_status?.qr_code_generated ??
    (employee.registration_status === 'fully_registered' ? true : undefined);

  // Normalize QR image from details (GET by ID) or fallback to list item if present
  const qrFromDetails = normalizeQrImage(
    // Preferred: nested info object
    (details as any)?.qr_code_info?.qr_code_image ||
    (details as any)?.qr_code_info?.image ||
    (details as any)?.qr_code_info?.qr ||
    // Flat fields on details
    (details as any)?.qr_code_image ||
    (details as any)?.qr_code ||
    (details as any)?.qr_code_image_url ||
    // Fallback to the employee object passed from the table/list
    (employee as any)?.qr_code_info?.qr_code_image ||
    (employee as any)?.qr_code_image ||
    (employee as any)?.qr_code ||
    (employee as any)?.qr_code_image_url ||
    null
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const handleDownloadQR = () => {
    const src = qrImage || qrFromDetails;
    if (!src) return;
    // Create a temporary link to download the QR image
    const link = document.createElement('a');
    link.href = src;
    link.download = `employee-${employee.employee_id}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 5MB", variant: "destructive" });
      return;
    }
    setUploadFile(file);
  };

  const handleUploadBiometrics = () => {
    if (!uploadFile || !employee?.employee_id) {
      toast({ title: "Select a photo", description: "Choose an image to upload.", variant: "destructive" });
      return;
    }
    uploadBiometrics(
      { employeeId: employee.employee_id, file: uploadFile },
      {
        onSuccess: async (resp) => {
          // resp contains { data, message }
          setQrImage(normalizeQrImage(resp.data.qr_code_image));
          // Optimistically reflect status
          setDetails((prev) => prev ? {
            ...prev,
            biometric_status: {
              fingerprint_registered: prev.biometric_status?.fingerprint_registered ?? false,
              facial_biometrics_registered: true,
              qr_code_generated: true,
            }
          } : prev);
          toast({ title: "Success", description: resp.message || "QR code generated successfully." });
          // refetch details to update biometric_status
          try {
            const refreshed = await getEmployee(employee.employee_id);
            setDetails(refreshed);
          } catch {}
        },
        onError: (err: any) => {
          toast({ title: "Upload failed", description: err?.message || "Could not upload biometrics", variant: "destructive" });
        },
      }
    );
  };

  const handleEdit = () => {
    onEdit(employee);
    onClose();
  };

  const handlePrintCard = () => {
    if (!employee) return;
    const title = `${employee.first_name} ${employee.last_name} – Employee ${printMode === 'card' ? 'ID Card' : 'Details'}`;
    const sizeCss = pageSize === 'Letter' ? 'Letter' : 'A4';

    const qrSrc = qrImage || qrFromDetails || '';
    const photo = (details as any)?.image_url || (employee as any)?.image_url || '';
    const name = `${employee.first_name} ${employee.last_name}`;
    const code = employee.employee_code;
    const dept = employee.department;
    const position = employee.position;
    const phone = employee.phone;
    const email = employee.email;
    const salaryBlock = includeSensitive && typeof salaryNumber === 'number' ? `<div style=\"margin-top:6px; font-size:12px\"><strong>Salary:</strong> XAF ${salaryNumber.toLocaleString()}</div>` : '';

    const brandLogo = '/logo.png';
    const brandHeader = `<div style=\"display:flex; align-items:center; gap:8px; margin-bottom:12px;\">`+
      `<img src=\"${brandLogo}\" alt=\"Logo\" style=\"height:24px; width:auto; object-fit:contain;\" onerror=\"this.style.display='none'\"/>`+
      `<div style=\"font-weight:700; letter-spacing:.3px;\">WICON</div>`+
      `</div>`;

    const watermarkCss = `
      .wm:before{content:'WICON'; position:absolute; inset:0; font-weight:800; font-size:72px; color:#0001; display:block; transform:rotate(-30deg); text-align:center; padding-top:40%; pointer-events:none}
    `;

    const cardHtml = (copies: number) => {
      const cardInner = `
        <div class=\"idcard\">
          ${brandHeader}
          <div class=\"header\">
            <div class=\"photo\"><img src=\"${photo}\" alt=\"${name}\" onerror=\"this.style.display='none'\"/></div>
            <div class=\"meta\">
              <div class=\"name\">${name}</div>
              <div class=\"code\">${code}</div>
              <div class=\"dept\">${dept} • ${position}</div>
              <div class=\"contact\">${phone} • ${email}</div>
              ${salaryBlock}
            </div>
          </div>
          <div class=\"qr\">
            ${qrSrc ? `<img src=\"${qrSrc}\" alt=\"QR\"/>` : '<div class=\"qr-missing\">QR not available</div>'}
          </div>
        </div>
      `;
      if (!multiPerPage || copies <= 1) return cardInner;
      const items = Array.from({length: copies}, () => cardInner).join('');
      return `<div class=\"grid\">${items}</div>`;
    };

    const fullHtml = () => {
      const node = printRef.current;
      return `<div class=\"card\">${node ? node.innerHTML : ''}</div>`;
    };

    const w = window.open('', '_blank', 'width=1000,height=1200');
    if (!w) return;
    const html = `<!doctype html>
    <html>
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>${title}</title>
        <style>
          :root { color-scheme: light; }
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans'; background:#f8fafc; margin:0; padding:24px; }
          img { max-width:100%; height:auto; }
          .card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:24px; max-width:820px; margin:0 auto; box-shadow: 0 1px 2px rgba(16,24,40,.06); }
          .idcard { position:relative; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; width: 320px; min-height: 200px; box-shadow:0 1px 2px rgba(16,24,40,.06); }
          .idcard .header{ display:flex; gap:12px; }
          .idcard .photo{ width:64px; height:64px; border-radius:8px; overflow:hidden; background:#f1f5f9; flex:0 0 auto; }
          .idcard .photo img{ width:100%; height:100%; object-fit:cover; display:block; }
          .idcard .meta{ font-size:12px; line-height:1.3; }
          .idcard .name{ font-size:14px; font-weight:700; color:#0f172a; }
          .idcard .code{ font-size:12px; color:#475569; }
          .idcard .dept{ font-size:12px; color:#64748b; margin-top:2px; }
          .idcard .contact{ font-size:11px; color:#94a3b8; margin-top:2px; }
          .idcard .qr{ margin-top:10px; display:flex; align-items:center; justify-content:center; }
          .idcard .qr img{ width:120px; height:120px; object-fit:contain; }
          .idcard .qr-missing{ width:120px; height:120px; display:flex; align-items:center; justify-content:center; color:#64748b; border:1px dashed #cbd5e1; border-radius:8px; font-size:12px; }
          .grid{ display:grid; grid-template-columns: repeat(2, 1fr); gap:16px; }
          ${watermarkCss}
          @page { size: ${sizeCss}; margin: 12mm; }
          @media print { body { background:#fff; padding:0; } .card { box-shadow:none; border-color:#ddd; } }
        </style>
      </head>
      <body class=\"wm\">
        ${printMode === 'card' ? cardHtml(multiPerPage ? copiesPerPage : 1) : fullHtml()}
        <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); }<\\/script>
      </body>
    </html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle data-testid="modal-title-detail">Employee Details</DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={handlePrintCard} title="Print or Save as PDF">
                <Printer className="w-4 h-4" /> Print / PDF
              </Button>
              <Button size="sm" className="gap-2" onClick={handleDownloadPdf} title="Download as PDF">
                <Download className="w-4 h-4" /> Download PDF
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPrintOptions(v => !v)} title="Print options">Options</Button>
            </div>
          </div>
        </DialogHeader>

        {showPrintOptions && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Print Mode</label>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="radio" name="print_mode" checked={printMode==='full'} onChange={()=>setPrintMode('full')} /> Full details</label>
                  <label className="flex items-center gap-2"><input type="radio" name="print_mode" checked={printMode==='card'} onChange={()=>setPrintMode('card')} /> Compact ID Card</label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sensitive Info</label>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={includeSensitive} onChange={(e)=>setIncludeSensitive(e.target.checked)} /> Include salary</label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Page Size</label>
                <select className="w-full border rounded p-2 bg-background" value={pageSize} onChange={(e)=>setPageSize(e.target.value as any)}>
                  <option value="A4">A4</option>
                  <option value="Letter">US Letter</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Multiple Cards Per Page</label>
                <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={multiPerPage} onChange={(e)=>setMultiPerPage(e.target.checked)} /> Enable</label>
                  <input type="number" min={2} max={12} step={1} value={copiesPerPage} onChange={(e)=>setCopiesPerPage(Math.max(2, Math.min(12, Number(e.target.value)||2)))} className="w-24 border rounded p-2 bg-background disabled:opacity-50" disabled={!multiPerPage} />
                </div>
                <p className="text-xs text-muted-foreground">Tip: For ID cards, 8-10 per page on A4/Letter usually fits well.</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6" ref={printRef}>
          {/* Employee Header */}
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={(details as any)?.image_url || (employee as any)?.image_url || ""} alt={`${employee.first_name} ${employee.last_name}`} className="object-cover" />
              <AvatarFallback className="bg-muted text-2xl">
                {getInitials(employee.first_name, employee.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-foreground" data-testid="text-employee-name">
                {employee.first_name} {employee.last_name}
              </h3>
              <p className="text-lg text-muted-foreground" data-testid="text-employee-position">
                {employee.position}
              </p>
              <p className="text-muted-foreground" data-testid="text-employee-department">
                {employee.department}
              </p>
              <div className="mt-3">
                <Badge 
                  variant={employee.status === 'active' ? 'default' : 'secondary'}
                  data-testid="badge-employee-status"
                >
                  {employee.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">Contact Information</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground" data-testid="text-employee-email">
                    {employee.email}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground" data-testid="text-employee-phone">
                    {employee.phone}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">Employment Details</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <IdCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    ID: <span data-testid="text-employee-id">{employee.employee_code}</span>
                  </span>
                </div>
                {typeof salaryNumber === 'number' && (
                  <div className="flex items-center gap-3">
                   Salary:
                    <span className="text-foreground" data-testid="text-employee-salary">
                      {`XAF ${salaryNumber.toLocaleString()}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Biometrics & QR Section */}
          <div className="bg-muted p-6 rounded-lg space-y-4">
            <h4 className="font-medium text-foreground">Facial Biometrics & QR</h4>
            <p className="text-sm text-muted-foreground">
              Upload an employee facial photo to generate a QR code from the backend.
            </p>

            {/* Status */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={(faceRegistered ? 'default' : 'secondary') as any}>
                {loadingDetails && faceRegistered === undefined ? 'Face: Loading…' : `Face: ${faceRegistered ? 'Registered' : 'Not registered'}`}
              </Badge>
              <Badge variant={(qrGenerated ? 'default' : 'secondary') as any}>
                {loadingDetails && qrGenerated === undefined ? 'QR: Loading…' : `QR: ${qrGenerated ? 'Generated' : 'Not generated'}`}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="bg-white p-4 rounded-lg" data-testid="qr-code-container">
                {qrImage || qrFromDetails ? (
                  <img src={(qrImage || qrFromDetails) as string} alt="QR Code" className="w-32 h-32 object-contain" />
                ) : (
                  <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">No QR yet</p>
                      <p className="text-[10px] text-gray-500">Upload a photo to generate</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    id="biometric-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSelectFile}
                  />
                  <Button
                    variant="outline"
                    type="button"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" /> Choose Photo
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUploadBiometrics}
                    disabled={isUploadingBiometrics}
                    className="gap-2"
                  >
                    {isUploadingBiometrics ? 'Uploading...' : 'Upload & Generate QR'}
                  </Button>
                </div>
                {uploadFile && (
                  <p className="text-xs text-muted-foreground mt-1">Selected: {uploadFile.name}</p>
                )}
                <div className="mt-4 space-y-2">
                  <Button onClick={handleDownloadQR} disabled={!qrImage && !qrFromDetails} data-testid="button-download-qr">
                    <Download className="h-4 w-4 mr-2" /> Download QR Code
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowQrLightbox(true)}
                    disabled={!qrImage && !qrFromDetails}
                    data-testid="button-view-qr"
                  >
                    View Full-size QR
                  </Button>
                  {(details?.qr_code_info?.expires_at || details?.qr_code_expires_at) && (
                    <p className="text-xs text-muted-foreground">Expires: {new Date((details?.qr_code_info?.expires_at || details?.qr_code_expires_at) as string).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>

            {/* QR Lightbox */}
            <Dialog open={showQrLightbox} onOpenChange={setShowQrLightbox}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-center p-2">
                  {(qrImage || qrFromDetails) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(qrImage || qrFromDetails) as string}
                      alt="QR Code Full"
                      className="w-72 h-72"
                      data-testid="image-qr-full"
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleEdit}
              data-testid="button-edit-employee"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Employee
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="button-close-detail"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
