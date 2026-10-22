import "./App.css";

import {
    BrowserRouter,
    Routes,
    Route,
    useLocation,
} from "react-router-dom";

import Header from "./components/Header";
import LatestCartBar from "./components/LatestCartBar";

import HomeEntry from "./pages/HomeEntry";
import RestaurantDetail from "./pages/RestaurantDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import AddressPage from "./pages/Address";
import VoucherWallet from "./pages/VoucherWallet";
import WalletHistory from "./pages/WalletHistory";

import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";

import Notifications from "./pages/Notifications";
import Promotions from "./pages/Promotions";

import AdminAccounts from "./pages/AdminAccounts";
import AdminLayout from "./pages/AdminLayout";
import AdminHome from "./pages/AdminHome";
import AdminRestaurants from "./pages/AdminRestaurants";
import AdminPromotions from "./pages/AdminPromotions";
import AdminRestaurantContract from "./pages/AdminRestaurantContract";
import AdminContracts from "./pages/AdminContracts";
import AdminDoiSoat from "./pages/AdminDoiSoat";
import AdminFinance from "./pages/AdminFinance";

import QuanLayout from "./pages/RestaurantLayout";
import QuanHome from "./pages/RestaurantHome";
import RestaurantDoiSoat from "./pages/RestaurantDoiSoat";
import RestaurantWallet from "./pages/RestaurantWallet";
import QuanRestaurantInfo from "./pages/RestaurantInfo";
import QuanRestaurantStatus from "./pages/RestaurantStatus";
import RestaurantOrders from "./pages/RestaurantOrders";
import RestaurantOrderDetail from "./pages/RestaurantOrderDetail";
import RestaurantCategory from "./pages/RestaurantCategory";
import RestaurantMenu from "./pages/RestaurantMenu";
import RestaurantTopping from "./pages/RestaurantTopping";
import Restaurants from "./pages/Restaurants";
import RegisterRestaurant from "./pages/RegisterRestaurant";
import RestaurantLegalProfile from "./pages/RestaurantLegalProfile";
import RestaurantContract from "./pages/RestaurantContract";


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
