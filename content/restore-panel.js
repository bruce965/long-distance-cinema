if (window.__LONGDISTANCECINEMA) {
  window.__LONGDISTANCECINEMA.panel.style.display = '';

  'DONE';  // returned to invoker
}
else if (window.Peer == null) {
  'NEED_PEER';  // returned to invoker
}
else {
  'READY';  // returned to invoker
}
