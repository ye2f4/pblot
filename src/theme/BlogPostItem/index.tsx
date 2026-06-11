import { useBlogPost } from "@docusaurus/plugin-content-blog/client";
import type { WrapperProps } from "@docusaurus/types";
import Comments from "@site/src/components/Comments";
import BlogPostItem from "@theme-original/BlogPostItem";
import type BlogPostItemType from "@theme/BlogPostItem";

type Props = WrapperProps<typeof BlogPostItemType>;

export default function BlogPostItemWrapper(props: Props): JSX.Element {
  const { metadata, isBlogPostPage } = useBlogPost();
  const { comments = true, image, series } = metadata.frontMatter;

  return (
    <>
      {/* 非文章详情页（列表页）显示封面和系列标签 */}
      {!isBlogPostPage && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
          {image && (
            <img 
              src={image} 
              alt={metadata.title} 
              style={{ 
                width: 80, 
                height: 80, 
                borderRadius: 8, 
                objectFit: 'cover',
                flexShrink: 0
              }} 
            />
          )}
          <div style={{ flex: 1 }}>
            {series && (
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: '#2E7D9E',
                color: '#fff',
                borderRadius: 4,
                fontSize: 12,
                marginBottom: 4
              }}>
                {series}
              </span>
            )}
            <BlogPostItem {...props} />
          </div>
        </div>
      )}

      {/* 文章详情页正常显示 */}
      {isBlogPostPage && <BlogPostItem {...props} />}
      
      {comments && isBlogPostPage && <Comments />}
    </>
  );
}