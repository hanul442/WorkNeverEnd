// 홈 화면에 설치(PWA)할 수 있게 서비스 워커를 등록한다. 다른 페이지 안에 들어가 있을 때는 하지 않는다.
if ('serviceWorker' in navigator && window.top === window && /^(https:|http:\/\/localhost|http:\/\/127\.)/.test(location.href)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
