/** 页脚：ICP 备案号。
 *
 * 非经营性网站在国内上线要求页面底部展示备案号并链接到工信部备案系统，
 * 检查通常从站点首页开始抓 —— 本站首页要登录才看得到，所以登录页也必须有一份，
 * 否则未登录访客（以及备案核查）在公开入口上根本看不见备案号。
 *
 * 只放这两处（登录页、书签首页），设置页等内页不重复。
 * 颜色用最弱一档 ink4：合规信息要在场，但不能和书签内容抢视线。 */
export default function SiteFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`text-center text-[11.5px] text-ink4 ${className}`}>
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noreferrer"
        className="underline-offset-2 hover:text-ink3 hover:underline"
      >
        京ICP备2025115934号
      </a>
    </footer>
  )
}