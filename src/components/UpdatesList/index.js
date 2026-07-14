import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import styles from '../../pages/index.module.css';
import articlesData from '../../data/articles.json';

export default function UpdatesList({ siteData }) {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    const list = (articlesData?.articles || [])
      .filter((a) => a.date)
      .slice(0, 6)
      .map((a) => ({
        date: a.date,
        content: a.title,
        link: a.url,
      }));
    setUpdates(list.length > 0 ? list : (siteData.updates || []));
  }, [siteData.updates]);

  return (
    <div className={styles.sectionCard}>
      <h3 className={styles.sectionTitle}>{siteData.texts.updatesTitle}</h3>
      <ul className={styles.updateList}>
        {updates.map((item, i) => (
          <li key={i} className={styles.updateItem}>
            <span className={styles.updateDate}>{item.date}</span>
            {item.link ? (
              <Link to={item.link} className="update-content" style={{ color: '#333', textDecoration: 'none' }}>
                {item.content}
              </Link>
            ) : (
              <span className="update-content">{item.content}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
