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

/* ── Single label — 58mm x 40mm Thermal Label ── */
const SingleLabel: React.FC<{ product: Product; shopName: string }> = ({ product, shopName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !product.barcode) return;
    try {
      JsBarcode(canvasRef.current, product.barcode, {
        format: 'CODE128',
        width: 2,
        height: 45,
        displayValue: true,   // Barcode eka yata number eka pennanawa
        fontSize: 10,
        textMargin: 2,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000',
      });
    } catch (e) {
      console.error("Barcode Error:", e);
    }
  }, [product.barcode]);

  const unit = product.unit || 'pcs';

  return (
    <div
      className="barcode-label bg-white inline-flex flex-col items-center print:border-0"
      style={{ width: 212, padding: '4px 6px', fontFamily: 'Arial, sans-serif', gap: 0, pageBreakInside: 'avoid' }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', margin: '0 0 3px', lineHeight: 1.2 }}>
        {product.name.toUpperCase()}
      </p>

      {product.barcode ? (
        <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
      ) : (
        <div style={{ width: 180, height: 55, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>
          No Barcode
        </div>
      )}

      <p style={{ fontSize: 12, fontWeight: 700, margin: '4px 0' }}>
        Rs. {product.selling_price.toLocaleString()} / {unit}
      </p>

      <p style={{ fontSize: 10, fontWeight: 700, borderTop: '1px solid #333', paddingTop: 2, width: '100%', textAlign: 'center', marginTop: 1 }}>
        {shopName}
      </p>
    </div>
  );
};

/* ── Dialog ── */
const BarcodePrintDialog: React.FC<BarcodePrintDialogProps> = ({ product, shopName, onClose }) => {
  const { t } = useLanguage();
  const [qty, setQty] = useState(1);

  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = 'barcode-print-style';
    style.textContent = `
      @page {
        size: 58mm auto;
        margin: 2mm;
      }
      @media print {
        body * { visibility: hidden !important; }
        #barcode-print-area, #barcode-print-area * { visibility: visible !important; }
        #barcode-print-area {
          position: absolute; top: 0; left: 0; width: 100%;
          display: flex; flex-direction: column; gap: 2mm; padding: 0;
        }
        .barcode-label { 
          border: none !important; 
          width: 54mm !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.getElementById('barcode-print-style')?.remove();
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

          <div
            id="barcode-print-area"
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
