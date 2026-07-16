import { Link } from "react-router-dom";
import Logo from "./Logo";
import Badge from "./Badge";
import { ROUTES } from "../../router/routes";

export default function Navbar() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        {/* <div className="flex gap-6"> */}
        <Link to={ROUTES.home} className="flex items-center gap-3">
          <Logo />
          <span className="text-lg font-semibold">SpectraCalc</span>
        </Link>
        <Link
          to={"https://github.com/dolgovv"}
          className="flex items-center gap-3"
        >
          <Badge tone="muted">by dolgovv</Badge>
        </Link>
        {/* </div> */}
      </div>
    </header>
  );
}
