import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    children?: React.ReactNode;
}

const SEO = ({
    title = 'Moviesir - AI 기반 영화 추천 챗봇',
    description = '취향에 맞는 영화를 AI 챗봇에게 추천받으세요. OTT 정보부터 상세 리뷰까지 한눈에 확인 가능합니다.',
    keywords = '영화추천, 챗봇, AI영화, 무비서, OTT영화',
    ogTitle,
    ogDescription,
    ogImage = '/moviesir-logo.png',
    ogUrl = 'https://moviesir.cloud',
    twitterTitle,
    twitterDescription,
    twitterImage,
    children
}: SEOProps) => {
    const finalTitle = (title.includes('Moviesir') || title.includes('무비서')) ? title : `${title} | Moviesir`;

    return (
        <Helmet>
            {/* 기본 메타 태그 */}
            <title>{finalTitle}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={ogUrl} />
            <meta property="og:title" content={ogTitle || finalTitle} />
            <meta property="og:description" content={ogDescription || description} />
            <meta property="og:image" content={ogImage} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={ogUrl} />
            <meta property="twitter:title" content={twitterTitle || ogTitle || finalTitle} />
            <meta property="twitter:description" content={twitterDescription || ogDescription || description} />
            <meta property="twitter:image" content={twitterImage || ogImage} />

            {children}
        </Helmet>
    );
};

export default SEO;
