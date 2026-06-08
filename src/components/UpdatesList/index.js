import React from 'react';

export default function UpdatesList({ siteData }) {
    return (
        <div className="section-card">
            <h3 className="section-title">{siteData.texts.updatesTitle}</h3>
            <ul className="update-list">
                {siteData.updates.map((item, i) => (
                    <li key={i} className="update-item">
                        <span className="update-date">{item.date}</span>
                        <span className="update-content">{item.content}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}