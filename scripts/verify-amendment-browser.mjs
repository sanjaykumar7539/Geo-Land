const target = await fetch("http://127.0.0.1:9222/json/new?http%3A%2F%2F%5B%3A%3A1%5D%3A5173%2F", { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const browserErrors = [];
let id = 0;

socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") browserErrors.push(message.params.entry.text);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function send(method, params = {}) {
  const callId = ++id;
  socket.send(JSON.stringify({ id: callId, method, params }));
  return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }));
}
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression, label, timeout = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${label}`);
};
const clickText = (selector, text) => evaluate(`(() => { const item=[...document.querySelectorAll(${JSON.stringify(selector)})].find(el=>el.textContent.includes(${JSON.stringify(text)})); if(!item)return false; item.click(); return true })()`);
const fill = (selector, value) => evaluate(`(() => { const input=document.querySelector(${JSON.stringify(selector)}); if(!input)return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); return true })()`);

await send("Runtime.enable");
await send("Log.enable");
await waitFor("document.querySelector('.dataset-picker')?.textContent.includes('loaded')", "dataset load", 45000);
await clickText(".rail nav button", "Amendments");
await waitFor("document.querySelector('.amendment-page') !== null", "amendment workspace");
await evaluate("document.querySelector('.parcel-results button')?.click()");
await clickText(".wizard-actions button", "Continue");
await waitFor("document.querySelector('input[placeholder=\"Enter full legal name\"]') !== null", "transfer step");
await fill("input[placeholder=\"Enter full legal name\"]", "Kumar Test");
await clickText(".wizard-actions button", "Continue");
await waitFor("document.querySelector('.area-entry input') !== null", "boundary step");
await fill(".area-entry input", "40");
await clickText(".wizard-actions button", "Continue");
await waitFor("document.querySelectorAll('.verification-list input').length === 2", "documents step");
await evaluate("[...document.querySelectorAll('.verification-list input')].forEach(input=>input.click())");
await clickText(".wizard-actions button", "Continue");
await waitFor("document.querySelector('.review-summary') !== null", "review step");
await clickText(".wizard-actions button", "Submit amendment");
await waitFor("document.querySelector('.application-list')?.textContent.includes('AMD-0001')", "created amendment");
await clickText(".automation-actions button", "Prepare notice");
for (let index = 0; index < 4; index += 1) {
  await clickText(".automation-actions button", index === 3 ? "Approve" : "Accept & move");
  await new Promise((resolve) => setTimeout(resolve, 150));
}
await waitFor("document.querySelector('.application-list')?.textContent.includes('Approved')", "officer approval");
await clickText(".automation-actions button", "Generate order");
await waitFor("document.querySelector('.application-list')?.textContent.includes('Order ready')", "generated order");

const result = await evaluate(`({
  heading: document.querySelector('.amendment-page h2')?.textContent,
  application: document.querySelector('.application-main b')?.textContent,
  status: document.querySelector('.amend-status')?.textContent,
  triage: document.querySelector('.triage')?.textContent,
  notice: document.querySelector('.automation-actions')?.textContent.includes('Notice queued'),
  order: document.querySelector('.automation-actions')?.textContent.includes('Order ready'),
  loaded: document.querySelector('.dataset-picker span')?.textContent
})`);
console.log(JSON.stringify({ result: browserErrors.length ? "FAIL" : "PASS", ...result, browserErrors }, null, 2));
socket.close();
if (browserErrors.length) process.exitCode = 1;
