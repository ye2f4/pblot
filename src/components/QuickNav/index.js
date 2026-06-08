import React from 'react';
import Link from '@docusaurus/Link';

export default function QuickNav({ siteData }) {
    return (
        <div className="section-card">
            <h3 className="section-title">{siteData.texts.quickNavTitle}</h3>
            <div className="nav-grid">
                {siteData.quickNav.map((item, i) => (
                    <Link
                        key={i}
                        to={item.link}
                        className="nav-card"
                        style={{ borderLeft: `4px solid ${item.color}` }}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-name">{item.name}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}