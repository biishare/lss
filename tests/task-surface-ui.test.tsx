import "./dom-environment";
import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { TaskSurface, type MobileSurface } from "../app/components/task-surface";
import { useConfirmation } from "../app/components/use-confirmation";
import { domWindow } from "./dom-environment";

afterEach(cleanup);
after(async () => { await domWindow.happyDOM.close(); });

test("fecho sem alterações não pergunta; alterações pedem decisão na mesma superfície", async () => {
  let closed = 0;
  window.confirm = () => { throw new Error("Confirmação nativa inesperada"); };
  function Harness() {
    const [value, setValue] = useState("");
    return <TaskSurface title="Corrigir contacto" onClose={() => { closed++; }} dirty={value !== ""}
      actions={(close) => <button onClick={close}>Fechar</button>}>
      <label>Contacto<input value={value} onChange={(event) => setValue(event.target.value)} /></label>
    </TaskSurface>;
  }
  render(<Harness />);
  const labelledDialog = screen.getByRole("dialog", { name: "Corrigir contacto" });
  const labelId = labelledDialog.getAttribute("aria-labelledby");
  assert.equal([...document.querySelectorAll("[id]")].filter((element) => element.id === labelId).length, 1);
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  assert.equal(closed, 1);
  const dialog = screen.getByRole("dialog"), input = screen.getByLabelText("Contacto");
  fireEvent.change(input, { target: { value: "840000001" } });
  fireEvent.keyDown(dialog, { key: "Escape" });
  assert.equal(closed, 1);
  assert.equal(screen.getAllByRole("dialog").length, 1);
  assert.ok(screen.getByRole("region", { name: "Alterações por guardar" }));
  const keep = screen.getByRole("button", { name: "Continuar a editar" });
  await waitFor(() => assert.equal(document.activeElement, keep));
  fireEvent.click(keep);
  assert.equal(screen.getByLabelText("Contacto"), input);
  assert.equal((input as HTMLInputElement).value, "840000001");
  fireEvent.click(screen.getByRole("button", { name: "Fechar tarefa" }));
  fireEvent.click(screen.getByRole("button", { name: "Descartar alterações" }));
  assert.equal(closed, 2);
  assert.equal(screen.getByRole("dialog"), dialog);
});

test("uma mudança de apresentação conserva o nó, preenchimento e erro da tarefa", () => {
  let mounted = 0;
  function Form() {
    const [id] = useState(() => { mounted++; return "tentativa-estável"; });
    const [error, setError] = useState("");
    return <form data-command={id} onSubmit={(event) => { event.preventDefault(); setError("A gravação falhou. Tente novamente."); }}>
      <label>Valor<input defaultValue="400" /></label><button type="submit">Guardar</button>{error && <p role="alert">{error}</p>}
    </form>;
  }
  const surface = (mobile: MobileSurface) => <TaskSurface title="Pagamento" mobile={mobile} onClose={() => {}}><Form /></TaskSurface>;
  const page = render(surface("sheet"));
  const input = screen.getByLabelText("Valor"), dialog = screen.getByRole("dialog");
  fireEvent.change(input, { target: { value: "625" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  page.rerender(surface("full-screen"));
  assert.equal(mounted, 1);
  assert.equal(screen.getByRole("dialog"), dialog);
  assert.equal(screen.getByLabelText("Valor"), input);
  assert.equal((input as HTMLInputElement).value, "625");
  assert.match(screen.getByRole("alert").textContent ?? "", /gravação falhou/);
  assert.equal(document.querySelector("form")?.getAttribute("data-command"), "tentativa-estável");
});

test("uma gravação em curso bloqueia Fechar e Escape sem perder o formulário", () => {
  let closed = 0;
  render(<TaskSurface title="Guardar" busy onClose={() => { closed++; }}><input aria-label="Motivo" defaultValue="Conferido" /></TaskSurface>);
  const dialog = screen.getByRole("dialog");
  fireEvent.keyDown(dialog, { key: "Escape" });
  assert.equal(closed, 0);
  assert.equal((screen.getByRole("button", { name: "Fechar tarefa" }) as HTMLButtonElement).disabled, true);
  assert.match(screen.getByRole("status").textContent ?? "", /A guardar/);
  assert.equal((screen.getByLabelText("Motivo") as HTMLInputElement).value, "Conferido");
});

test("confirmação própria cancela por Escape e só autoriza pela acção explícita", async () => {
  function Harness() {
    const { requestConfirmation, confirmation } = useConfirmation();
    const [answer, setAnswer] = useState("");
    return <><button onClick={async () => setAnswer(String(await requestConfirmation({ title: "Substituir dados?", message: "Os dados locais serão substituídos.", confirmLabel: "Substituir dados" })))}>Abrir revisão</button><output>{answer}</output>{confirmation}</>;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir revisão" }));
  fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
  await waitFor(() => assert.equal(document.querySelector("output")?.textContent, "false"));
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  fireEvent.click(screen.getByRole("button", { name: "Abrir revisão" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Substituir dados" }));
  await waitFor(() => assert.equal(document.querySelector("output")?.textContent, "true"));
});
