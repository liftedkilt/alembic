// Inline <script> injected before hydration so theme and font preferences
// are applied synchronously — prevents a flash of the default light theme
// for users who prefer dark/sepia.
const SCRIPT = `(function(){try{
  var t=localStorage.getItem('alembic-theme');
  var f=localStorage.getItem('alembic-font');
  var s=localStorage.getItem('alembic-font-scale');
  var h=document.documentElement;
  if(t==='dark'||t==='sepia')h.classList.add(t);
  var fonts={
    'source-serif':'"Source Serif 4", ui-serif, Georgia, serif',
    'merriweather':'Merriweather, ui-serif, Georgia, serif',
    'lora':'Lora, ui-serif, Georgia, serif',
    'georgia':'Georgia, "Times New Roman", serif',
    'system-sans':'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  };
  if(f&&fonts[f])h.style.setProperty('--reader-font-family',fonts[f]);
  var n=Number(s);
  if(n&&isFinite(n)&&n>=0.5&&n<=2)h.style.setProperty('--reader-font-scale',String(n));
}catch(e){}})();`;

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
