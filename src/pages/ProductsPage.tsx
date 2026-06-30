import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Search, Download, Upload, Printer, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getProducts, getSuppliers, addProduct, updateProduct, deleteProduct, deleteAllProducts } from '@/services/api';
import type { Product, Supplier } from '@/types/types';
import * as XLSX from 'xlsx';
import BarcodePrintDialog from '@/components/products/BarcodePrintDialog';
import ExcelImportDialog from '@/components/products/ExcelImportDialog';

const UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'box', 'packet', 'bottle', 'can', 'bag', 'bundle', 'dozen', 'pair', 'roll', 'sheet', 'set', 'tube'];

const generateBarcode = () => {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${now}${rand}`;
};

const schema = z.object({
  name: z.string().min(1, 'Required'),
  barcode: z.string().optional(),
  unit: z.string().default('pcs'),
  category: z.string().optional(),
  cost_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(10),
  supplier_id: z.string().optional(),
  expiry_date: z.string().optional(),
  discount_type: z.enum(['none', 'percentage', 'fixed', 'bogo']).default('none'),
  discount_value: z.coerce.number().min(0).default(0),
  bogo_buy: z.coerce.number().int().min(1).default(2),
  bogo_free: z.coerce.number().int().min(1).default(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const ProductsPage: React.FC = () => {
  const { profile, shop } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteAll, setDeleteAll] = useState(false);
  const [barcodePrint, setBarcodePrint] = useState<Product | null>(null);
  const [showImport, setShowImport] = useState(false);

  const form = useForm<FormData>({ resolver: zodResolver(schema) as Resolver<FormData>, defaultValues: { unit: 'pcs', discount_type: 'none', low_stock_threshold: 10, cost_price: 0, selling_price: 0, stock: 0, discount_value: 0, bogo_buy: 2, bogo_free: 1 } });

  const loadData = async () => {
    if (!shop?.id) return;
    setLoading(true);
    const [prodRes, suppRes] = await Promise.all([
      getProducts(shop.id, search || undefined),
      getSuppliers(shop.id),
    ]);
    setProducts(prodRes.data as Product[]);
    setSuppliers(suppRes.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [shop?.id]);
  useEffect(() => {
    const timer = setTimeout(() => loadData(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openAdd = () => {
    form.reset({ unit: 'pcs', discount_type: 'none', low_stock_threshold: 10, cost_price: 0, selling_price: 0, stock: 0, discount_value: 0, bogo_buy: 2, bogo_free: 1 });
    setEditProduct(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    form.reset({
      name: p.name,
      barcode: p.barcode || '',
      unit: p.unit || 'pcs',
      category: p.category || '',
      cost_price: p.cost_price,
      selling_price: p.selling_price,
      stock: p.stock,
      low_stock_threshold: p.low_stock_threshold,
      supplier_id: p.supplier_id || '',
      expiry_date: p.expiry_date || '',
      discount_type: p.discount_type || 'none',
      discount_value: p.discount_value || 0,
      bogo_buy: p.bogo_buy ?? 2,
      bogo_free: p.bogo_free ?? 1,
      notes: p.notes || '',
    });
    setEditProduct(p);
    setShowForm(true);
  };

  const onSubmit = async (data: FormData) => {
    if (!shop?.id) return;
    if (data.cost_price > data.selling_price) toast.warning(t('costHigherThanSelling'));

    const payload = {
      ...data,
      shop_id: shop.id,
      unit: data.unit || 'pcs',
      barcode: data.barcode || undefined,
      supplier_id: data.supplier_id || undefined,
      expiry_date: data.expiry_date || undefined,
      category: data.category || undefined,
      notes: data.notes || undefined,
      bogo_buy: data.discount_type === 'bogo' ? (data.bogo_buy ?? 2) : undefined,
      bogo_free: data.discount_type === 'bogo' ? (data.bogo_free ?? 1) : undefined,
    };

    if (editProduct) {
      const { error } = await updateProduct(editProduct.id, payload);
      if (error) { toast.error((error as Error).message); return; }
    } else {
      // Check duplicate barcode
      if (data.barcode) {
        const existing = products.find(p => p.barcode === data.barcode);
        if (existing) { toast.error(t('duplicateBarcode')); return; }
      }
      const { error } = await addProduct(payload);
      if (error) { toast.error((error as Error).message); return; }
    }
    toast.success(t('success'));
    setShowForm(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteProduct(deleteId);
    if (error) { toast.error((error as Error).message); } else { toast.success(t('success')); loadData(); }
    setDeleteId(null);
  };

  const handleDeleteAll = async () => {
    if (!shop?.id) return;
    const { error } = await deleteAllProducts(shop.id);
    if (error) { toast.error((error as Error).message); } else { toast.success(t('success')); loadData(); }
    setDeleteAll(false);
  };

  const handleExcelExport = () => {
    const rows = products.map(p => ({
      Name: p.name,
      Barcode: p.barcode || '',
      Category: p.category || '',
      'Cost Price': p.cost_price,
      'Selling Price': p.selling_price,
      'Profit Margin': p.selling_price > 0 ? (((p.selling_price - p.cost_price) / p.selling_price) * 100).toFixed(2) + '%' : '0%',
      Stock: p.stock,
      'Low Stock Threshold': p.low_stock_threshold,
      'Expiry Date': p.expiry_date || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `products_${shop?.name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const lowStockProducts = products.filter(p => p.stock <= p.low_stock_threshold);
  const expiringProducts = products.filter(p => {
    if (!p.expiry_date) return false;
    const days = Math.ceil((new Date(p.expiry_date).getTime() - Date.now()) / 86400000);
    return days <= 30 && days > 0;
  });

  const discountType = form.watch('discount_type');

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-balance">{t('products')}</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload className="h-3.5 w-3.5 mr-1" /><span className="hidden sm:inline">{t('importExcel')}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExcelExport}>
              <Download className="h-3.5 w-3.5 mr-1" /><span className="hidden sm:inline">{t('exportExcel')}</span>
            </Button>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteAll(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /><span className="hidden sm:inline">{t('deleteAll')}</span>
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" />{t('addProductBtn')}
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {(lowStockProducts.length > 0 || expiringProducts.length > 0) && (
          <div className="space-y-2">
            {lowStockProducts.length > 0 && (
              <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg px-4 py-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <span className="text-sm">{lowStockProducts.length} products low stock</span>
              </div>
            )}
            {expiringProducts.length > 0 && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm">{expiringProducts.length} products expiring within 30 days</span>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchProduct')} className="pl-9 px-3" />
        </div>

        {/* Table */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {[t('productName'), t('barcode'), t('costPrice'), t('sellingPrice'), t('stock'), t('supplier'), t('expiryDate'), t('discountOffer'), t('actions')].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j} className="px-3 py-2"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : products.length === 0 ? (
                    <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">{t('noData')}</td></tr>
                  ) : products.map(p => {
                    const isLow = p.stock <= p.low_stock_threshold;
                    const isExpiring = p.expiry_date && Math.ceil((new Date(p.expiry_date).getTime() - Date.now()) / 86400000) <= 30;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{p.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground text-xs">{p.barcode || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">Rs. {p.cost_price.toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-semibold text-primary">Rs. {p.selling_price.toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Badge variant={p.stock === 0 ? 'destructive' : isLow ? 'secondary' : 'outline'} className="text-xs">
                            {isLow && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}{p.stock}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs">{(p as unknown as { suppliers?: { name: string } }).suppliers?.name || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs">
                          {p.expiry_date ? (
                            <span className={isExpiring ? 'text-destructive font-medium' : ''}>
                              {p.expiry_date}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs">
                          {p.discount_type && p.discount_type !== 'none' ? (
                            <Badge variant="secondary" className="text-xs">
                              {p.discount_type === 'bogo' ? 'BOGO' : `${p.discount_type === 'percentage' ? p.discount_value + '%' : 'Rs.' + p.discount_value} off`}
                            </Badge>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBarcodePrint(p)}><Printer className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editProduct ? t('editProduct') : t('addProductBtn')}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-normal">{t('productName')}</FormLabel>
                    <FormControl><Input className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                {/* Barcode with auto-generate button */}
                <FormField control={form.control} name="barcode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-normal">{t('barcode')}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl><Input className="px-3 flex-1" placeholder="Enter or generate" {...field} /></FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        title="Auto-generate barcode"
                        onClick={() => field.onChange(generateBarcode())}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                {/* Unit dropdown */}
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-normal">Unit</FormLabel>
                    <Select value={field.value || 'pcs'} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-normal">{t('category')}</FormLabel>
                    <FormControl><Input className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="supplier_id" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-normal">{t('supplier')}</FormLabel>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cost_price" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-normal">{t('costPrice')}</FormLabel>
                    <FormControl><Input type="number" className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="selling_price" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-normal">{t('sellingPrice')}</FormLabel>
                    <FormControl><Input type="number" className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="stock" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-normal">{t('stock')}</FormLabel>
                    <FormControl><Input type="number" className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="low_stock_threshold" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-normal">{t('lowStockThreshold')}</FormLabel>
                    <FormControl><Input type="number" className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="expiry_date" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-normal">{t('expiryDate')}</FormLabel>
                    <FormControl><Input type="date" className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="discount_type" render={({ field }) => (
                  <FormItem><FormLabel className="text-sm font-normal">{t('discountOffer')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t('noneDiscount')}</SelectItem>
                        <SelectItem value="percentage">{t('percentage')}</SelectItem>
                        <SelectItem value="fixed">{t('fixed')}</SelectItem>
                        <SelectItem value="bogo">{t('bogoOffer')}</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                {discountType !== 'none' && discountType !== 'bogo' && (
                  <FormField control={form.control} name="discount_value" render={({ field }) => (
                    <FormItem><FormLabel className="text-sm font-normal">{t('discountValue')}</FormLabel>
                      <FormControl><Input type="number" className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
              </div>

              {/* BOGO buy/free config — shown only when bogo selected */}
              {discountType === 'bogo' && (
                <div className="border border-primary/20 bg-primary/5 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold text-primary">Buy X Get Y Free — Config</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="bogo_buy" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-normal">Buy (X) qty</FormLabel>
                        <FormControl><Input type="number" min={1} className="px-3" {...field} /></FormControl>
                        <p className="text-xs text-muted-foreground">Customer buy කරන ගණන</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="bogo_free" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-normal">Get Free (Y) qty</FormLabel>
                        <FormControl><Input type="number" min={1} className="px-3" {...field} /></FormControl>
                        <p className="text-xs text-muted-foreground">නොමිලේ ලබන ගණන</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <p className="text-xs text-primary font-medium">
                    Preview: Buy {form.watch('bogo_buy') || 2} Get {form.watch('bogo_free') || 1} Free
                    &nbsp;(Buy {(form.watch('bogo_buy') || 2) + (form.watch('bogo_free') || 1)} pay for {form.watch('bogo_buy') || 2})
                  </p>
                </div>
              )}

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel className="text-sm font-normal">{t('notes')}</FormLabel>
                  <FormControl><Input className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
                <Button type="submit">{t('save')}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>{t('deleteProduct')}</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this product?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all confirm */}
      <AlertDialog open={deleteAll} onOpenChange={setDeleteAll}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>{t('deleteAll')}</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will deactivate ALL products.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Barcode Print Dialog */}
      {barcodePrint && (
        <BarcodePrintDialog product={barcodePrint} shopName={shop?.name || ''} onClose={() => setBarcodePrint(null)} />
      )}

      {/* Excel Import Dialog */}
      {showImport && shop?.id && (
        <ExcelImportDialog
          shopId={shop.id}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); loadData(); toast.success('Import සාර්ථකයි!'); }}
        />
      )}
    </MainLayout>
  );
};

export default ProductsPage;
