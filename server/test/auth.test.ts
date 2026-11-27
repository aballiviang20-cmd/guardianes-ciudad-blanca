import { describe, expect, it } from "vitest";
import { login, verifyToken } from "../src/auth";

describe("cuentas de demostración", () => {
  it("el docente entra con su contraseña y el token lo identifica", () => {
    const r = login("profe.vargas", "Sucre1538");
    expect(r?.user.role).toBe("docente");
    expect(r?.user.courses).toEqual(["4TO-A", "6TO-A"]);
    expect(verifyToken(r!.token)?.username).toBe("profe.vargas");
    expect(JSON.stringify(r?.user)).not.toContain("hash");
  });

  it("las alumnas tienen su nivel", () => {
    expect(login("camila.4to", "guardiana4")?.user.level).toBe("4to");
    expect(login("lucia.6to", "guardiana6")?.user.level).toBe("6to");
  });

  it("rechaza contraseñas incorrectas y tokens alterados", () => {
    expect(login("profe.vargas", "otra")).toBeNull();
    expect(login("nadie", "x")).toBeNull();
    const t = login("camila.4to", "guardiana4")!.token;
    expect(verifyToken(t.slice(0, -2) + "xx")).toBeNull();
    expect(verifyToken("basura")).toBeNull();
  });
});
