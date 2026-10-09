import WorkspaceIcon from './WorkspaceIcon.jsx'

export default function WorkspaceSectionTitle({ id, icon, children }) {
  return (
    <h3 className="ew-workspace-section-title" id={id}>
      <WorkspaceIcon name={icon} />
      <span>{children}</span>
    </h3>
  )
}
