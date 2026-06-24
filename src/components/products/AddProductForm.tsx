import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface AddProductFormProps {
  shopId: string | number;
  onSaveProduct: (product: { name: string; price: number; barcode: string; shop_id: string | number }) => void;
}

const AddProductForm: React.FC<AddProductFormProps> = ({ shopId, onSaveProduct }) => {
  const [productName, setProductName] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [barcode, setBarcode] = useState<string>('');
  
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (barcode && barcodeSvgRef.current) {
      try {
        JsBarcode(barcodeSvgRef.current, barcode, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 40,
          displayValue: true
        });
      } catch (error) {
        console.error("Barcode error:", error);
      }
    }
  }, [barcode]);

  const generateAutoBarcode = () => {
    const shortShopId = shopId ? String(shopId).slice(0, 4) : 'POS';
    const timestamp = Date.now().toString().slice(-6);
    setBarcode(`${shortShopId}${timestamp}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !price || !barcode) {
      alert("කරුණාකර සියලුම විස්තර ඇතුළත් කරන්න!");
      return;
    }

    onSaveProduct({
      name: productName,
      price: parseFloat(price),
      barcode: barcode,
      shop_id: shopId
    });

    setProductName('');
    setPrice('');
    setBarcode('');
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', background: '#fff', fontFamily: 'sans-serif' }}>
      <h3 style={{ marginTop: 0, color: '#333' }}>අලුත් භාණ්ඩයක් ඇතුළත් කිරීම</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>භාණ්ඩයේ නම:</label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>මිල (රු.):</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>බාර්කෝඩ් අංකය:</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="ස්කෑන් කරන්න හෝ අගය දාන්න" style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <button type="button" onClick={generateAutoBarcode} style={{ padding: '8px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Auto Generate</button>
          </div>
          <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>💡 බාර්කෝඩ් එකක් තියෙනවා නම්, මේ කොටුව ක්ලික් කරලා Scanner එකෙන් ස්කෑන් කරන්න.</small>
        </div>

        {barcode && (
          <div style={{ textAlign: 'center', margin: '20px 0', padding: '10px', background: '#f9f9f9', borderRadius: '4px', border: '1px dashed #ccc' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#555' }}>Barcode Preview:</p>
            <svg ref={barcodeSvgRef}></svg>
          </div>
        )}

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>භාණ්ඩය සේව් කරන්න</button>
      </form>
    </div>
  );
};

export default AddProductForm;
