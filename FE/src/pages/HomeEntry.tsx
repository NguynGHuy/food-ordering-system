import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/userService";
import Home from "./Home";
import HomeSkeleton from "../components/HomeSkeleton";

function HomeEntry() {
    const [destination, setDestination] = useState<
        "checking" | "admin" | "public"
    >(() => localStorage.getItem("token") ? "checking" : "public");

    useEffect(() => {
        if (!localStorage.getItem("token")) return;

        getCurrentUser()
            .then((user: { role: string }) => {
                setDestination(user.role === "Admin" ? "admin" : "public");
            })
            .catch(() => setDestination("public"));
    }, []);

    if (destination === "checking") {
        return <HomeSkeleton />;
    }

    if (destination === "admin") {
        return <Navigate to="/admin" replace />;
    }

    return <Home />;
}

export default HomeEntry;
