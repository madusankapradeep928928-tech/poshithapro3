import React, { useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Product } from '@/types/types';

interface BarcodePrintDialogProps {
  product: Product;
  shopName: string;
  onClose: () => void;
}

/* ── Single label — Cargills-style format ── */
const SingleLabel: React.FC<{ product: Product; shopName: string }> = ({ product, shopName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !product.barcode) return;
    try {
      JsBarcode(canvasRef.current, product.barcode, {
        format: 'CODE128',
        width: 2,
        height: 55,
        displayValue: false,   // we render the number manually below
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {}
  }, [product.barcode]);

  const unit = product.unit || 'pcs';

  return (
    /* outer frame — 58 mm × 40 mm label */
    <div
      className="barcode-label bg-white border border-gray-800 inline-flex flex-col items-center"
      style={{ width: 220, padding: '6px 8px', fontFamily: 'Arial, sans-serif', gap: 0 }}
    >
      {/* Barcode number / code above the barcode */}
      {product.barcode && (
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, margin: '0 0 2px' }}>
          {product.barcode}
        </p>
      )}

      {/* Product name */}
      <p style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', margin: '0 0 3px', lineHeight: 1.2 }}>
        {product.name.toUpperCase()}
      </p>

      {/* Barcode image */}
      {product.barcode ? (
        <canvas ref={canvasRef} style={{ maxWidth: '100%' }} />
      ) : (
        <div style={{ width: 180, height: 55, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>
          No Barcode
        </div>
      )}

      {/* Barcode digits below bar */}
      {product.barcode && (
        <p style={{ fontSize: 9, letterSpacing: 1.5, margin: '1px 0 4px' }}>
          {product.barcode}
        </p>
      )}

      {/* Unit Price row */}
      <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 4px' }}>
        Unit Price :&nbsp;&nbsp;
        <span style={{ fontSize: 13 }}>Rs. {product.selling_price.toLocaleString()} / {unit}</span>
      </p>

      {/* Shop name footer */}
      <p style={{ fontSize: 11, fontWeight: 700, borderTop: '1px solid #333', paddingTop: 3, width: '100%', textAlign: 'center', marginTop: 2 }}>
        {shopName}
      </p>
    </div>
  );
};

/* ── Dialog ── */
const BarcodePrintDialog: React.FC<BarcodePrintDialogProps> = ({ product, shopName, onClose }) => {
  const { t } = useLanguage();
  const [qty, setQty] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #barcode-print-area, #barcode-print-area * { visibility: visible !important; }
        #barcode-print-area {
          position: fixed; top: 0; left: 0; width: 100%;
          display: flex; flex-wrap: wrap; gap: 4px; padding: 4px;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('printBarcode')} — {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground whitespace-nowrap">{t('barcodeQuantity')}:</label>
            <Input
              type="number"
              min={1}
              max={100}
              value={qty}
              onChange={e => setQty(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="w-24 px-3 h-8"
            />
          </div>

          {/* Preview area */}
          <div
            id="barcode-print-area"
            ref={printRef}
            className="border border-border rounded-lg p-3 bg-muted/20 max-h-72 overflow-y-auto"
          >
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: qty }).map((_, i) => (
                <SingleLabel key={i} product={product} shopName={shopName} />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />{t('printBarcode')} ({qty})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodePrintDialog;

