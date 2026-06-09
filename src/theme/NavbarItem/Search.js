import React from 'react';
import { DocSearch } from '@docsearch/react';
import '@docsearch/css';

export default function SearchBar() {
    return (
        <DocSearch
            appId="ROGAN8VK8F"
            apiKey="fe400fed06536292c70c9f6ef42f24f9"
            indexName="ye2f4_github_io_rogan8vk8f_pages"
            searchParameters={{
                attributesToSearchOn: ["title", "description", "content", "keywords"],
                attributesToRetrieve: ["title", "description", "content", "url"],
                attributesToSnippet: ["content:10"],
            }}
        />
    );
}