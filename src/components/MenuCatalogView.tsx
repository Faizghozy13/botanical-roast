import {
  Camera,
  Check,
  Coffee,
  GlassWater,
  Heart,
  Leaf,
  Plus,
  PlusCircle,
  Search,
  ShoppingBag,
  Star,
  Utensils,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatRupiah } from '../shared/pricing';
import type { CartItem, Product, ProductCategory } from '../shared/types';

interface MenuCatalogViewProps {
  products: Product[];
  loading: boolean;
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onGoToCheckout: () => void;
}

const CATEGORIES: { key: 'Semua' | ProductCategory; label: string; subtitle: string }[] = [
  { key: 'Kopi', label: 'Kopi', subtitle: 'Pilihan Kopi & Seduhan' },
  { key: 'Non-Kopi', label: 'Non-Kopi', subtitle: 'Segar & Pilihan Minuman Sehat' },
  { key: 'Makanan', label: 'Makanan', subtitle: 'Main Course, Snack & Pancong' },
];

const SUBCATEGORY_ORDER: Record<ProductCategory, string[]> = {
  Kopi: ['Espresso Based', 'Flavourcano', 'Manual Brew', 'Kopi Sachet', 'Add-On Kopi'],
  'Non-Kopi': [
    'Non Coffee',
    'Blend',
    'Tea Series',
    'Mocktail',
    'Non Kopi Sachet',
    'Add-On Minuman',
  ],
  Makanan: ['Main Course', 'Snack & Camilan', 'Pancong Melted', 'Add-On Makanan'],
};

const SUBCATEGORY_NOTES: Record<string, string> = {
  Flavourcano: '(Espresso Infused Flavors)',
  'Manual Brew': '(Artisanal Pour-Over)',
  'Kopi Sachet': 'Catatan: Panas / Hot -1K • Extra Seduh +2K',
  'Non Kopi Sachet': 'Catatan: Panas / Hot -1K • Extra Seduh +2K',
  'Add-On Kopi': 'Tambahan untuk racikan kopi Anda',
  'Add-On Minuman': 'Tambahan untuk sajian minuman Anda',
  'Add-On Makanan': 'Porsi ekstra & pelengkap santapan Anda',
};

export function MenuCatalogView({
  products,
  loading,
  cart,
  onAddToCart,
  onGoToCheckout,
}: MenuCatalogViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | ProductCategory>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const qtyById = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.product.id, item.quantity);
    }
    return map;
  }, [cart]);

  const totalItemsInCart = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmountInCart = cart.reduce(
    (acc, item) => acc + item.product.priceIdr * item.quantity,
    0,
  );

  const filteredProducts = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'Semua' && p.category !== selectedCategory) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.subcategory.toLowerCase().includes(term)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  const handleAdd = (product: Product) => {
    onAddToCart(product);
    setJustAddedId(product.id);
    setTimeout(() => {
      setJustAddedId((curr) => (curr === product.id ? null : curr));
    }, 600);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#fcf9f2] pt-20 pb-28">
      {/* Subtle Ambient Blobs matching HTML */}
      <div
        className="pointer-events-none absolute -top-12 -right-16 h-80 w-80 text-[#182519] opacity-[0.06]"
        aria-hidden="true"
      >
        <svg className="h-full w-full rotate-12" fill="currentColor" viewBox="0 0 200 200">
          <path
            d="M42.8,-63.9C54.4,-57.2,62.2,-44.1,68.8,-30C75.4,-15.9,80.8,-0.9,78.9,13.6C77.1,28,68,41.9,56.7,53.2C45.3,64.4,31.7,73,16.7,76.5C1.8,79.9,-14.6,78.2,-29.4,72.1C-44.2,66.1,-57.3,55.8,-65.8,42.4C-74.3,28.9,-78.1,12.3,-76.3,-3.8C-74.4,-19.9,-66.8,-35.6,-55.4,-44.9C-43.9,-54.2,-28.7,-57.2,-14.5,-61.8C-0.3,-66.4,13,-72.6,26.7,-72.2C40.5,-71.7,31.2,-70.6,42.8,-63.9Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
        {/* Hero Header */}
        <section className="flex flex-col items-center pt-2 text-center">
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[#7a582f]">
            <Leaf className="h-4 w-4" aria-hidden="true" />
            <span>Green Cafe Artisanal</span>
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#182519] md:text-[44px] md:leading-[52px]">
            Daftar Menu
          </h1>
        </section>

        {/* Sticky Filter & Search Bar */}
        <section className="sticky top-20 z-30 flex flex-col items-stretch justify-between gap-3 border-b border-[#ebe8e1]/80 bg-[#fcf9f2]/95 py-3 backdrop-blur-md lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            {(['Semua', 'Kopi', 'Non-Kopi', 'Makanan'] as const).map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-[#2d3b2d] text-white shadow-sm'
                      : 'bg-[#f6f3ec] text-[#444842] hover:bg-[#ebe8e1] hover:text-[#182519]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-80">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#747872]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu favoritmu..."
              aria-label="Cari menu favoritmu"
              className="w-full rounded-full bg-white py-2.5 pr-4 pl-10 text-sm text-[#1c1c18] shadow-sm placeholder:text-[#747872] focus:ring-1 focus:ring-[#2d3b2d] focus:outline-none"
            />
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-[#f1eee7]" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl bg-[#f6f3ec] p-10 text-center">
            <p className="font-serif text-xl font-semibold text-[#182519]">
              Menu tidak ditemukan
            </p>
            <p className="mt-1 text-sm text-[#444842]">
              Coba kata kunci lain atau pilih kategori Semua.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {CATEGORIES.map(({ key, label, subtitle }) => {
              if (selectedCategory !== 'Semua' && selectedCategory !== key) return null;
              const categoryProducts = filteredProducts.filter((p) => p.category === key);
              if (categoryProducts.length === 0) return null;

              const CategoryIcon =
                key === 'Kopi' ? Coffee : key === 'Non-Kopi' ? GlassWater : Utensils;
              const subOrder = SUBCATEGORY_ORDER[key as ProductCategory];

              return (
                <section key={key} className="flex flex-col gap-6">
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-[#ebe8e1] pb-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full ${
                          key === 'Kopi'
                            ? 'bg-[#182519]/10 text-[#182519]'
                            : key === 'Non-Kopi'
                              ? 'bg-[#d4e8d2]/60 text-[#182519]'
                              : 'bg-[#fecf9d]/60 text-[#7a582f]'
                        }`}
                      >
                        <CategoryIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <h2 className="font-serif text-xl font-bold tracking-tight text-[#182519]">
                        {label}
                      </h2>
                    </div>
                    <span className="text-xs font-medium text-[#747872]">{subtitle}</span>
                  </div>

                  {/* Subcategories */}
                  {subOrder.map((subName) => {
                    const subItems = categoryProducts.filter((p) => p.subcategory === subName);
                    if (subItems.length === 0) return null;
                    const isAddonGroup = subItems[0]?.isAddon;
                    const isSachetNote =
                      subName === 'Kopi Sachet' || subName === 'Non Kopi Sachet';
                    const subNote = SUBCATEGORY_NOTES[subName];

                    if (isAddonGroup) {
                      return (
                        <div
                          key={subName}
                          className="flex flex-col gap-3 rounded-2xl border border-[#c4c8c0]/40 bg-[#f6f3ec]/80 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <PlusCircle className="h-4 w-4 text-[#7a582f]" aria-hidden="true" />
                            <h3 className="text-sm font-bold text-[#182519]">{subName}</h3>
                            {subNote && <span className="text-xs text-[#747872]">{subNote}</span>}
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {subItems.map((item) => (
                              <MenuItemCard
                                key={item.id}
                                product={item}
                                inCartQty={qtyById.get(item.id) ?? 0}
                                justAdded={justAddedId === item.id}
                                onAdd={() => handleAdd(item)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={subName} className="flex flex-col gap-4">
                        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-4 w-1.5 rounded-full ${
                                key === 'Makanan' ? 'bg-[#7a582f]' : 'bg-[#2d3b2d]'
                              }`}
                            />
                            <h3 className="font-serif text-lg font-semibold text-[#182519]">
                              {subName}
                            </h3>
                            {subNote && !isSachetNote && (
                              <span className="text-xs text-[#747872]">{subNote}</span>
                            )}
                          </div>
                          {isSachetNote && subNote && (
                            <span className="self-start rounded-full bg-[#ffddba]/60 px-3 py-1 text-[11px] font-medium text-[#5f401a] sm:self-auto">
                              {subNote}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                          {subItems.map((item) => (
                            <MenuItemCard
                              key={item.id}
                              product={item}
                              inCartQty={qtyById.get(item.id) ?? 0}
                              justAdded={justAddedId === item.id}
                              onAdd={() => handleAdd(item)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalItemsInCart > 0 && (
        <div className="fixed right-4 bottom-5 left-4 z-40 mx-auto max-w-xl">
          <div className="flex items-center justify-between gap-4 rounded-full bg-[#182519] px-5 py-3 text-white shadow-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2d3b2d]">
                <ShoppingBag className="h-4 w-4 text-[#d7e7d3]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#bbcbb8] tabular-nums">
                  {totalItemsInCart} item dipilih
                </p>
                <p className="truncate text-sm font-bold tabular-nums">
                  {formatRupiah(totalAmountInCart)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoToCheckout}
              className="shrink-0 rounded-full bg-[#fecf9d] px-5 py-2 text-xs font-bold text-[#2b1700] transition-colors hover:bg-[#ffddba] sm:text-sm"
            >
              Lanjut Pembayaran
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItemCard({
  product,
  inCartQty,
  justAdded,
  onAdd,
}: {
  product: Product;
  inCartQty: number;
  justAdded: boolean;
  onAdd: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article
      className={`group flex flex-col justify-between overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        product.isAddon ? 'border border-[#c4c8c0]/60' : ''
      } ${!product.inStock ? 'opacity-65' : ''}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f6f3ec]">
        {product.imageUrl && !imgFailed ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#747872]">
            <Camera className="h-7 w-7 opacity-55" aria-hidden="true" />
            <span className="text-[11px] font-medium tracking-wide text-[#444842]/70">
              {product.isAddon ? 'Foto Add-On' : 'Foto Menu'}
            </span>
          </div>
        )}

        {product.badge && (
          <div
            className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
              product.badge === 'Favorit' || product.badge === 'Free Refill'
                ? 'bg-[#d4e8d2] text-[#101f11]'
                : product.badge === 'Best for Sharing'
                  ? 'bg-[#ffddba] text-[#2b1700]'
                  : 'bg-[#fecf9d] text-[#79562e]'
            }`}
          >
            {product.badge === 'Signature' && <Star className="h-3 w-3" aria-hidden="true" />}
            {product.badge === 'Favorit' && <Heart className="h-3 w-3" aria-hidden="true" />}
            <span>{product.badge}</span>
          </div>
        )}

        {product.isAddon && (
          <div className="absolute top-3 left-3">
            <span className="inline-block rounded bg-[#182519]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#182519]">
              Add-On
            </span>
          </div>
        )}

        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#182519]/55">
            <span className="rounded-full bg-[#ffdad6] px-3 py-1 text-xs font-bold text-[#93000a]">
              Habis
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h4 className="font-serif text-base font-semibold text-[#182519] transition-colors group-hover:text-[#2d3b2d]">
            {product.name}
          </h4>
          <p className="text-xs leading-relaxed text-[#747872]">{product.description}</p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex flex-col">
            <span className="text-[11px] text-[#747872]">Harga</span>
            <span
              className={`font-serif text-base font-bold tabular-nums ${
                product.isAddon ? 'text-[#7a582f]' : 'text-[#182519]'
              }`}
            >
              {formatRupiah(product.priceIdr)}
            </span>
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={onAdd}
            className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-semibold shadow-sm transition-all active:scale-95 whitespace-nowrap ${
              justAdded
                ? 'bg-[#7a582f] text-white'
                : 'bg-[#2d3b2d] text-white hover:bg-[#162517]'
            } disabled:cursor-not-allowed disabled:bg-[#c4c8c0]`}
          >
            {justAdded ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ditambah</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tambah{inCartQty > 0 ? ` (${inCartQty})` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
