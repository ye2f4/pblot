import React from 'react';
import Link from '@docusaurus/Link';

export default function TagCloud({ siteData }) {
    return (
        <div className="section-card">
            <h3 className="section-title">{siteData.texts.tagsTitle}</h3>
            <div className="tag-cloud">
                {siteData.tags.map((tag, i) => (
                    <Link
                        key={i}
                        to={`/pblot/tags/${tag.name.toLowerCase()}`}
                        className="tag-item"
                        style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            border: `1px solid ${tag.color}40`
                        }}
                    >
                        {tag.name}
                        <span className="tag-count">({tag.count})</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}