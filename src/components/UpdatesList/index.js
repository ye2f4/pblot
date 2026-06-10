import React from 'react';
import styles from '../../pages/index.module.css';

export default function UpdatesList({ siteData }) {
    return (
        <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>{siteData.texts.updatesTitle}</h3>
            <ul className={styles.updateList}>
                {siteData.updates.map((item, i) => (
                    <li key={i} className={styles.updateItem}>
                        <span className={styles.updateDate}>{item.date}</span>
                        <span className="update-content">{item.content}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
