import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import ReportMenu from './reportMenu.jsx';
import { Config } from './config.js';

function Host() {
	const [menu, setMenu] = useState(null);

	useEffect(() => {
		const handler = (e) => setMenu(e.detail);
		window.addEventListener('cell-report', handler);
		return () => window.removeEventListener('cell-report', handler);
	}, []);

	if (!menu) return null;

	const handleReport = async (reason) => {
		setMenu(null);
		try {
			await fetch(Config.BACKEND + Config.ENDPOINT.REPORT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ term: menu.term, imageUrl: menu.imageUrl, reason }),
			});
		} catch (err) {
			console.warn('[report] Failed to send:', err);
		}
	};

	return (
		<ReportMenu
			term={menu.term}
			imageUrl={menu.imageUrl}
			onClose={() => setMenu(null)}
			onReport={handleReport}
		/>
	);
}

createRoot(document.getElementById('report-menu-root')).render(React.createElement(Host));
