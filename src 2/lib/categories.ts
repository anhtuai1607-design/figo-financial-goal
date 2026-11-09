import {
  Utensils,
  Coffee,
  Zap,
  Home,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Bus,
  Fuel,
  Clapperboard,
  Shirt,
  Smartphone,
  Gift,
  PawPrint,
  Baby,
  Plane,
  Wrench,
  Landmark,
  PiggyBank,
  Briefcase,
  TrendingUp,
  Laptop,
  HandCoins,
  Sparkles,
  ArrowLeftRight,
  CircleDollarSign,
  Dumbbell,
  Wifi,
  Shield,
  ShoppingCart,
  Store,
  Package,
  Sofa,
  UtensilsCrossed,
  Film,
  School,
  BookOpen,
  Stethoscope,
  Pill,
  Car,
  HandHeart,
  LineChart,
  Tv,
  Droplets,
  type LucideIcon,
} from "lucide-react";
import type { CustomCategory, TransactionType } from "./types";

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  type: TransactionType;
  hue: number; // for per-category colour, oklch hue
}

export const CATEGORIES: Category[] = [
  // Expense
  { id: "an_uong", name: "Ăn uống", icon: Utensils, type: "expense", hue: 35 },
  { id: "ca_phe", name: "Cà phê & Bạn bè", icon: Coffee, type: "expense", hue: 60 },
  { id: "dien_nuoc", name: "Tiền điện", icon: Zap, type: "expense", hue: 85 },
  { id: "internet", name: "Internet / Điện thoại", icon: Wifi, type: "expense", hue: 240 },
  { id: "nha_o", name: "Nhà trọ / Thuê nhà", icon: Home, type: "expense", hue: 200 },
  { id: "mua_sam", name: "Mua sắm", icon: ShoppingBag, type: "expense", hue: 330 },
  { id: "quan_ao", name: "Quần áo", icon: Shirt, type: "expense", hue: 300 },
  { id: "y_te", name: "Y tế / Sức khoẻ", icon: HeartPulse, type: "expense", hue: 15 },
  { id: "the_thao", name: "Thể thao", icon: Dumbbell, type: "expense", hue: 150 },
  { id: "giao_duc", name: "Giáo dục", icon: GraduationCap, type: "expense", hue: 260 },
  { id: "di_chuyen", name: "Di chuyển / Grab", icon: Bus, type: "expense", hue: 130 },
  { id: "xang_xe", name: "Xăng xe", icon: Fuel, type: "expense", hue: 100 },
  { id: "giai_tri", name: "Giải trí", icon: Clapperboard, type: "expense", hue: 350 },
  { id: "cong_nghe", name: "Công nghệ", icon: Smartphone, type: "expense", hue: 220 },
  { id: "qua_tang", name: "Quà tặng / Hiếu hỉ", icon: Gift, type: "expense", hue: 10 },
  { id: "thu_cung", name: "Thú cưng", icon: PawPrint, type: "expense", hue: 70 },
  { id: "con_cai", name: "Con cái / Gia đình", icon: Baby, type: "expense", hue: 320 },
  { id: "du_lich", name: "Du lịch", icon: Plane, type: "expense", hue: 190 },
  { id: "sua_chua", name: "Sửa chữa", icon: Wrench, type: "expense", hue: 50 },
  { id: "bao_hiem", name: "Bảo hiểm", icon: Shield, type: "expense", hue: 230 },
  { id: "tra_no", name: "Trả nợ / Vay", icon: Landmark, type: "expense", hue: 280 },
  { id: "tiet_kiem", name: "Tiết kiệm / Mục tiêu", icon: PiggyBank, type: "expense", hue: 165 },
  { id: "nuoc", name: "Tiền nước", icon: Droplets, type: "expense", hue: 210 },
  { id: "truyen_hinh", name: "Truyền hình cáp", icon: Tv, type: "expense", hue: 270 },
  { id: "sieu_thi", name: "Siêu thị", icon: ShoppingCart, type: "expense", hue: 140 },
  { id: "cho", name: "Chợ dân sinh", icon: Store, type: "expense", hue: 45 },
  { id: "mua_online", name: "Mua online (Shopee, Lazada, Tiki)", icon: Package, type: "expense", hue: 20 },
  { id: "gia_dung", name: "Đồ gia dụng", icon: Sofa, type: "expense", hue: 75 },
  { id: "nha_hang", name: "Nhà hàng", icon: UtensilsCrossed, type: "expense", hue: 25 },
  { id: "xem_phim", name: "Xem phim", icon: Film, type: "expense", hue: 340 },
  { id: "hoc_phi", name: "Học phí", icon: School, type: "expense", hue: 265 },
  { id: "sach_vo", name: "Sách vở", icon: BookOpen, type: "expense", hue: 290 },
  { id: "kham_benh", name: "Khám chữa bệnh", icon: Stethoscope, type: "expense", hue: 5 },
  { id: "thuoc", name: "Thuốc men", icon: Pill, type: "expense", hue: 355 },
  { id: "taxi", name: "Grab / Taxi", icon: Car, type: "expense", hue: 120 },
  { id: "dau_tu_chi", name: "Đầu tư", icon: LineChart, type: "expense", hue: 160 },
  { id: "tu_thien", name: "Từ thiện", icon: HandHeart, type: "expense", hue: 0 },
  { id: "khac_chi", name: "Chi khác", icon: Sparkles, type: "expense", hue: 250 },
  // Income
  { id: "luong", name: "Lương", icon: Briefcase, type: "income", hue: 165 },
  { id: "thuong", name: "Thưởng", icon: Gift, type: "income", hue: 40 },
  { id: "dau_tu", name: "Đầu tư / Lãi", icon: TrendingUp, type: "income", hue: 150 },
  { id: "freelance", name: "Freelance", icon: Laptop, type: "income", hue: 220 },
  { id: "duoc_tang", name: "Được tặng", icon: HandCoins, type: "income", hue: 330 },
  { id: "khac_thu", name: "Thu khác", icon: CircleDollarSign, type: "income", hue: 250 },
  // Transfer
  { id: "transfer", name: "Chuyển khoản", icon: ArrowLeftRight, type: "transfer", hue: 240 },
];

export const ICON_OPTIONS: Record<string, LucideIcon> = {
  utensils: Utensils, coffee: Coffee, home: Home, bag: ShoppingBag, cart: ShoppingCart, store: Store, shirt: Shirt, heart: HeartPulse,
  school: GraduationCap, book: BookOpen, bus: Bus, car: Car, fuel: Fuel, film: Clapperboard, phone: Smartphone, laptop: Laptop,
  gift: Gift, paw: PawPrint, baby: Baby, plane: Plane, wrench: Wrench, piggy: PiggyBank, work: Briefcase, trend: TrendingUp,
  dumbbell: Dumbbell, wifi: Wifi, tv: Tv, water: Droplets, coins: HandCoins, star: Sparkles,
};
export const HUE_OPTIONS = [15, 35, 60, 100, 150, 190, 220, 260, 300, 340];

let custom: Category[] = [];
export function applyCustomCategories(list: CustomCategory[]) {
  custom = list.map((c) => ({ id: c.id, name: c.name, type: c.type, icon: ICON_OPTIONS[c.icon] ?? Sparkles, hue: c.hue }));
}

const map = new Map(CATEGORIES.map((c) => [c.id, c]));
const fallbackCategory: Category = {
  id: "khac_chi",
  name: "Chi khác",
  icon: Sparkles,
  type: "expense",
  hue: 250,
};

export function getCategory(id: string): Category {
  return map.get(id) ?? custom.find((c) => c.id === id) ?? fallbackCategory;
}

export function categoriesByType(type: TransactionType) {
  return [...CATEGORIES, ...custom].filter((c) => c.type === type);
}

export function categoryColor(id: string, alpha = 1) {
  const c = getCategory(id);
  return `oklch(0.68 0.16 ${c.hue} / ${alpha})`;
}
