(function(){
  if(window._nativeBridgeInjected) return; window._nativeBridgeInjected = true;
  window.sendToNative = function(obj){ try{ var s = JSON.stringify(obj||{}); if(window.AndroidApp && typeof window.AndroidApp.postMessage === 'function'){ window.AndroidApp.postMessage(s); } else { console.log('sendToNative (no bridge):', s); } } catch(e){ console.error(e); } };
  window.onNativeMessage = window.onNativeMessage || function(msg){ try{ console.log('onNativeMessage', msg); } catch(e){} };
})();
