import React from 'react';
import { DocSearch } from '@docsearch/react';
import '@docsearch/css';

export default function Search() {
    return (
        <DocSearch
            appId="R0GAN8VK8F"
            apiKey="fe400fed06536292c70c9f6ef42f24f9"
            indexName="ye2f4_github_io_rogan8vk8f_pages"
            // 强制限定只检索真实存在的4个字段，完全抛弃hierarchy
            searchParameters={{
                attributesToSearchOn: ["title", "description", "content", "keywords"],
                attributesToRetrieve: ["title", "description", "content", "url"],
                attributesToSnippet: ["content:15"],
                facetFilters: [],
            }}
            // 数据预处理：把空hierarchy填充空字符串，避免组件渲染报错
            transformItems={(hits) => {
                return hits.map((hit) => {
                    // 兜底补全层级结构，组件不会报缺失字段
                    if (!hit.hierarchy) hit.hierarchy = {};
                    const hierarchyKeys = ["lvl0", "lvl1", "lvl2", "lvl3", "lvl4", "lvl5", "lvl6"];
                    hierarchyKeys.forEach(key => {
                        if (hit.hierarchy[key] === undefined || hit.hierarchy[key] === null) {
                            hit.hierarchy[key] = "";
                        }
                    });
                    return hit;
                });
            }}
            placeholder="搜索文档、教程、工具..."
        />
    );
}