import { GraphQLClient, gql } from 'graphql-request';

const endpoint = import.meta.env.WORDPRESS_GRAPHQL_URL ?? 'https://cms.562endodontics.com/graphql';

export const wp = new GraphQLClient(endpoint);

// ---- Consultas por tipo de contenido -------------------------------------

export const GET_TREATMENTS = gql`
  query GetTreatments {
    treatments(where: { orderby: { field: MENU_ORDER, order: ASC } }) {
      nodes {
        title
        slug
        content
        treatmentFields {
          icon
          summary
        }
      }
    }
  }
`;

export const GET_TEAM = gql`
  query GetTeam {
    teamMembers {
      nodes {
        title
        slug
        content
        teamMemberFields {
          credentials
          role
          photo
        }
      }
    }
  }
`;

export const GET_FAQS = gql`
  query GetFaqs {
    faqs {
      nodes {
        title
        content
      }
    }
  }
`;

// Página flexible por slug -> usada por src/pages/[...slug].astro
export const GET_FLEXIBLE_PAGE = gql`
  query GetFlexiblePage($slug: ID!) {
    flexiblePage(id: $slug, idType: SLUG) {
      title
      pageBlocks {
        blocks {
          __typename
          ... on FlexiblePagePageBlocksBlocksHeroLayout {
            heading
            text
            image
            ctaLabel
            ctaUrl
          }
          ... on FlexiblePagePageBlocksBlocksTextImageLayout {
            heading
            content
            image
            reverse
          }
          ... on FlexiblePagePageBlocksBlocksTreatmentGridLayout {
            heading
          }
          ... on FlexiblePagePageBlocksBlocksFaqAccordionLayout {
            heading
          }
          ... on FlexiblePagePageBlocksBlocksCtaBannerLayout {
            heading
            label
            url
          }
        }
      }
    }
  }
`;

// Lista de slugs para generar rutas estáticas de páginas flexibles en build.
export const GET_FLEXIBLE_PAGE_SLUGS = gql`
  query GetFlexiblePageSlugs {
    flexiblePages {
      nodes {
        slug
      }
    }
  }
`;
