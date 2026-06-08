import React from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';

export default function QuickNav({ siteData }) {
    return (
        <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>{siteData.texts.quickNavTitle}</h3>
            <div className={styles.navGrid}>
                {siteData.quickNav.map((item, i) => (
                    <Link
                        key={i}
                        to={item.link}
                        className={styles.navCard}
                        style={{ borderLeft: `4px solid ${item.color}` }}
                    >
                        <span className={styles.navIcon}>{item.icon}</span>
                        <span className={styles.navName}>{item.name}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}