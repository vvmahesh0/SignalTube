export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="app-footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/signaltube-logo.png" alt="" />
          <span>SignalTube</span>
        </div>
        <a
          href="https://www.linkedin.com/in/vvmahesh/"
          target="_blank"
          rel="noopener noreferrer"
          className="app-footer-credit"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/mahesh-photo.jpg" alt="" />
          <span>Created by Mahesh V V</span>
        </a>
      </div>
    </footer>
  );
}
