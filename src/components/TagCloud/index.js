import React from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';

export default function TagCloud({ siteData }) {
    return (
        <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>{siteData.texts.tagsTitle}</h3>
            <div className={styles.tagCloud}>
                {siteData.tags.map((tag, i) => (
                    <Link
                        key={i}
                        to={`/tags/${tag.name.toLowerCase()}`}
                        className={styles.tagItem}
                        style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            border: `1px solid ${tag.color}40`
                        }}
                    >
                        {tag.name}
                        <span className={styles.tagCount}>({tag.count})</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
