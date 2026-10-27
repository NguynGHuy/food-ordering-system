import "./App.css";
import { lazy, Suspense } from "react";
import RouteLoadBoundary from "./components/RouteLoadBoundary";

import {
    BrowserRouter,
    Routes,
    Route,
    useLocation,
} from "react-router-dom";

import Header from "./components/Header";
import LatestCartBar from "./components/LatestCartBar";

import HomeEntry from "./pages/HomeEntry";
const RestaurantDetail = lazy(() => import("./pages/RestaurantDetail"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const AddressPage = lazy(() => import("./pages/Address"));
const VoucherWallet = lazy(() => import("./pages/VoucherWallet"));
const WalletHistory = lazy(() => import("./pages/WalletHistory"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Promotions = lazy(() => import("./pages/Promotions"));
const AdminAccounts = lazy(() => import("./pages/AdminAccounts"));
const AdminLayout = lazy(() => import("./pages/AdminLayout"));
const AdminHome = lazy(() => import("./pages/AdminHome"));
const AdminRestaurants = lazy(() => import("./pages/AdminRestaurants"));
const AdminPromotions = lazy(() => import("./pages/AdminPromotions"));
const AdminRestaurantContract = lazy(() => import("./pages/AdminRestaurantContract"));
const AdminContracts = lazy(() => import("./pages/AdminContracts"));
const AdminDoiSoat = lazy(() => import("./pages/AdminDoiSoat"));
const AdminFinance = lazy(() => import("./pages/AdminFinance"));
const QuanLayout = lazy(() => import("./pages/RestaurantLayout"));
const QuanHome = lazy(() => import("./pages/RestaurantHome"));
const RestaurantDoiSoat = lazy(() => import("./pages/RestaurantDoiSoat"));
const RestaurantWallet = lazy(() => import("./pages/RestaurantWallet"));
const QuanRestaurantInfo = lazy(() => import("./pages/RestaurantInfo"));
const QuanRestaurantStatus = lazy(() => import("./pages/RestaurantStatus"));
const RestaurantOrders = lazy(() => import("./pages/RestaurantOrders"));
const RestaurantOrderDetail = lazy(() => import("./pages/RestaurantOrderDetail"));
const RestaurantCategory = lazy(() => import("./pages/RestaurantCategory"));
const RestaurantMenu = lazy(() => import("./pages/RestaurantMenu"));
const RestaurantTopping = lazy(() => import("./pages/RestaurantTopping"));
const Restaurants = lazy(() => import("./pages/Restaurants"));
const RegisterRestaurant = lazy(() => import("./pages/RegisterRestaurant"));
const RestaurantLegalProfile = lazy(() => import("./pages/RestaurantLegalProfile"));
const RestaurantContract = lazy(() => import("./pages/RestaurantContract"));
const InformationPage = lazy(() => import("./pages/InformationPage"));


import RealtimeBridge from "./components/RealtimeBridge";
import RealtimeToast from "./components/RealtimeToast";
import PageLoader from "./components/PageLoader";
import Footer from "./components/Footer";
import RouteScrollManager from "./components/RouteScrollManager";
import NotFound from "./pages/NotFound";

function AppContent() {
    const location = useLocation();

    const isAdminArea =
        location.pathname === "/admin" ||
        location.pathname.startsWith("/admin/");

    const isQuanArea =
        location.pathname === "/quan" ||
        location.pathname.startsWith("/quan/");

    const isCustomerArea =
    !isAdminArea && !isQuanArea;

    const isCustomerOrdersPage = location.pathname === "/don-hang";

    const showLatestCart =
        location.pathname === "/" ||
        location.pathname === "/nha-hang";

    return (
    <div
    className={
        isCustomerArea
            ? [
                "customer-app-shell",
                isCustomerOrdersPage ? "customer-orders-shell" : "",
              ]
                .filter(Boolean)
                .join(" ")
            : undefined
        }
    >
        <RouteScrollManager />
        <RealtimeBridge />
        <PageLoader key={location.key} />
        <RealtimeToast />

        {!isAdminArea && !isQuanArea && <Header />}

            <RouteLoadBoundary key={location.pathname}>
            <Suspense fallback={<p className="admin-access-message" role="status">Đang tải trang...</p>}>
            <Routes>

                {/* =========================
                    PUBLIC
                ========================= */}

                <Route
                    path="/"
                    element={<HomeEntry />}
                />

                <Route
                    path="/dang-nhap"
                    element={<Login />}
                />
                <Route path="/tro-giup" element={<InformationPage section="help" />} />
                <Route path="/chinh-sach-bao-mat" element={<InformationPage section="privacy" />} />
                <Route path="/dieu-khoan-su-dung" element={<InformationPage section="terms" />} />
                <Route path="/chinh-sach-giao-hang" element={<InformationPage section="delivery" />} />

                <Route
                    path="/dang-ky"
                    element={<Register />}
                />
                <Route
                    path="/dang-ky-nha-hang"
                    element={<RegisterRestaurant />}
                />

                <Route
                    path="/nha-hang/:id"
                    element={<RestaurantDetail />}
                />


                {/* =========================
                    KHÁCH HÀNG
                ========================= */}

                <Route
                    path="/ho-so"
                    element={<Profile />}
                />

                <Route
                    path="/dia-chi"
                    element={<AddressPage />}
                />

                <Route
                    path="/kho-voucher"
                    element={<VoucherWallet />}
                />

                <Route
                    path="/vi"
                    element={<WalletHistory />}
                />

                <Route
                    path="/gio-hang"
                    element={<Cart />}
                />

                <Route
                    path="/thanh-toan"
                    element={<Checkout />}
                />

                <Route
                    path="/don-hang"
                    element={<Orders />}
                />
                < Route
                    path = "/don-hang/:id"
                    element = {<OrderDetail />}
                />

                <Route
                    path="/thong-bao"
                    element={<Notifications />}
                />



                {/* =========================
                    QUAN - CHỦ NHÀ HÀNG
                ========================= */}
                <Route
                    path="/nha-hang"
                    element={<Restaurants />}
                />
                <Route
                    path="/quan"
                    element={<QuanLayout />}
                >
                    <Route
                        index
                        element={<QuanHome />}
                    />
                    <Route
                        path="thong-tin"
                        element={<QuanRestaurantInfo />}
                    />

                    <Route
                        path="ho-so-phap-ly"
                        element={<RestaurantLegalProfile />}
                    />

                    <Route path="hop-dong" element={<RestaurantContract />} />
                    <Route path="doi-soat" element={<RestaurantDoiSoat />} />
                    <Route path="vi" element={<RestaurantWallet />} />

                    <Route
                        path="trang-thai"
                        element={<QuanRestaurantStatus />}
                    />
                    {/* =========================
                            NGƯỜI 2 - MÓN ĂN
                        ========================= */}

                        <Route
                            path="danh-muc"
                            element={<RestaurantCategory />}
                        />

                        <Route
                            path="menu"
                            element={<RestaurantMenu />}
                        />

                        <Route
                            path="topping"
                            element={<RestaurantTopping />}
                        />

                        {/* ========================= */}

                    <Route
                        path="don-hang"
                        element={<RestaurantOrders />}
                    />
                    <Route
                        path="don-hang/:id"
                        element={<RestaurantOrderDetail />}
                    />

                    <Route
                        path="khuyen-mai"
                        element={<Promotions />}
                    />

                    <Route
                        path="thong-bao"
                        element={<Notifications />}
                    />
                </Route>


                {/* =========================
                    ADMIN
                ========================= */}

                <Route
                    path="/admin"
                    element={<AdminLayout />}
                >
                    <Route
                        index
                        element={<AdminHome />}
                    />

                    <Route
                        path="tai-khoan"
                        element={<AdminAccounts />}
                    />

                    <Route
                        path="nha-hang"
                        element={<AdminRestaurants />}
                    />

                    <Route path="hop-dong" element={<AdminContracts />} />
                    <Route path="doi-soat" element={<AdminDoiSoat />} />
                    <Route path="tai-chinh" element={<AdminFinance />} />

                    <Route
                        path="khuyen-mai"
                        element={<AdminPromotions />}
                    />

                    <Route
                        path="thong-bao"
                        element={<Notifications />}
                    />

                    <Route
                        path="nha-hang/:id/ho-so"
                        element={<AdminRestaurantContract />}
                    />
                    
                </Route>

                <Route path="*" element={<NotFound />} />

            </Routes>
            </Suspense>
            </RouteLoadBoundary>
            {showLatestCart && <LatestCartBar />}
            {!isAdminArea && !isQuanArea && <Footer />}
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
