import githubLogo from '@/assets/github-mark-white.svg'

interface GitHubLoginButtonProps {
  onClick: () => void
  disabled?: boolean
  text?: string
}

export default function GitHubLoginButton({
  onClick,
  disabled = false,
  text = 'GitHub로 계속하기'
}: GitHubLoginButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-11 bg-gray-900 border border-gray-700 rounded-full flex items-center justify-center gap-3 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      <img src={githubLogo} alt="GitHub" className="w-5 h-5" />
      <span className="text-sm font-medium text-white">{text}</span>
    </button>
  )
}
