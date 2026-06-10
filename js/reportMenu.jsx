import '../css/reportMenu.css';

const REASONS = [
	{ id: 'term',    label: 'Title is inappropriate' },
	{ id: 'image',   label: 'Image is inappropriate' },
	{ id: 'license', label: 'Image is not free use' },
];

export default function ReportMenu({ term, onClose, onReport }) {
	return (
		<>
			<div className="report-overlay" />
			<div className="report-menu">
				<div className="report-menu-header">
					<span className="report-menu-term">{term}</span>
					<button className="report-menu-close" onClick={onClose}>
						<span className="material-symbols-sharp">close</span>
					</button>
				</div>
				{REASONS.map(r => (
					<button key={r.id} className="report-menu-option" onClick={() => onReport(r.id)}>
						{r.label}
					</button>
				))}
			</div>
		</>
	);
}
