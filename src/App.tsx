import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Splash from "./pages/Splash";
import { Home } from "./pages/Home";
import { CompletedReminders } from "./pages/CompleteReminders";
import { ToastContainer } from "react-toastify";
import { PrivateRoute } from "./components/PrivateRoute";
import { RentIptuControl } from "./pages/RentIptuControl";
import { CarMaintenance } from "./pages/CarMaintenance";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<PrivateRoute element={<Home />} />} />
          <Route
            path="/concluidos"
            element={<PrivateRoute element={<CompletedReminders />} />}
          />
          <Route
            path="/alugueis"
            element={<PrivateRoute element={<RentIptuControl />} />}
          />
          <Route
            path="/manutencao-carros"
            element={<PrivateRoute element={<CarMaintenance />} />}
          />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default App;
