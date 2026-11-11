# Documentation de l'API SoundMap

URL de base : `/api`
Format des échanges : JSON (`Content-Type: application/json`).
En cas d'erreur, la réponse contient toujours un champ `error` décrivant le problème.

> Chaque membre du groupe complète la section correspondant à ses routes.

---

## Consultation des musiques & statistiques (Nabil)

### Lister les musiques

```
GET /api/musics
```

Renvoie la liste paginée des musiques, avec filtres et tri optionnels.

**Accès :** public (aucun header requis)

**Paramètres de requête** (tous optionnels) :

| Paramètre          | Type   | Défaut   | Description                                                                         |
| ------------------ | ------ | -------- | ----------------------------------------------------------------------------------- |
| `page`             | entier | `1`      | Numéro de la page (≥ 1).                                                            |
| `limit`/`pageSize` | entier | `10`     | Nombre de musiques par page (≥ 1). Toute valeur supérieure à 50 est ramenée à 50.  |
| `zone`             | string | –        | Identifiant MongoDB d'une zone : ne renvoie que les musiques de cette zone.        |
| `genre`            | string | –        | Genre exact, insensible à la casse (`rock` trouve `Rock`, mais `roc` ne trouve rien). |
| `search`           | string | –        | Texte recherché dans le titre **ou** l'artiste, insensible à la casse.             |
| `sort`             | string | `recent` | `recent` : plus récentes d'abord. `popular` : meilleur score d'abord.              |

Les filtres se combinent entre eux. Le **score** d'une musique vaut `upvotes - downvotes`.

**Exemple :**

```
GET /api/musics?page=1&limit=2&genre=electro&sort=popular
```

**Réponse `200 OK` :**

```json
{
  "page": 1,
  "limit": 2,
  "totalItems": 2,
  "totalPages": 1,
  "data": [
    {
      "_id": "6731f0c2a1b2c3d4e5f60718",
      "title": "Around the World",
      "artist": "Daft Punk",
      "genre": "Electro",
      "url": "https://open.spotify.com/track/...",
      "links": { "spotify": "", "appleMusic": "", "youtubeMusic": "" },
      "zone": {
        "_id": "6731f0c2a1b2c3d4e5f60701",
        "name": "HEIG-VD Yverdon",
        "location": { "type": "Point", "coordinates": [6.6412, 46.7785] },
        "radius": 500
      },
      "postedBy": { "_id": "6731f0c2a1b2c3d4e5f606ff", "username": "alice", "role": "user" },
      "upvotes": ["6731f0c2a1b2c3d4e5f606ff"],
      "downvotes": [],
      "score": 1,
      "createdAt": "2026-11-11T09:00:00.000Z",
      "id": "6731f0c2a1b2c3d4e5f60718"
    }
  ]
}
```

Une page au-delà de la dernière renvoie `200` avec `data: []`. Il en va de même pour une zone valide mais inexistante.

**Erreurs :**

| Code  | Cas                                                                                 |
| ----- | ----------------------------------------------------------------------------------- |
| `400` | `page`, `limit` ou `pageSize` n'est pas un entier ≥ 1 (ex. `page=-1`, `limit=abc`). |
| `400` | `zone` n'est pas un identifiant MongoDB valide.                                     |
| `400` | `sort` a une valeur autre que `recent` ou `popular`.                                |
| `400` | `genre` ou `search` est répété dans l'URL (ex. `?genre=Rock&genre=Jazz`).           |

---

### Statistiques par zone

```
GET /api/zones/stats/overview
GET /api/stats/overview        (alias)
```

Renvoie des statistiques globales ainsi qu'un résumé par zone, calculés avec le pipeline d'agrégation MongoDB (`$group` → `$lookup` → `$unwind` → `$project` → `$sort`).

**Accès :** public (aucun header requis)
**Paramètres :** aucun

**Réponse `200 OK` :**

```json
{
  "globalStats": {
    "totalMusics": 5,
    "totalUsers": 2
  },
  "zonesStats": [
    {
      "zoneId": "6731f0c2a1b2c3d4e5f60701",
      "zoneName": "HEIG-VD Yverdon",
      "totalMusics": 3,
      "totalUpvotes": 4,
      "totalDownvotes": 1,
      "averageScore": 1,
      "genres": ["Electro", "Rock"]
    },
    {
      "zoneId": "6731f0c2a1b2c3d4e5f60702",
      "zoneName": "Place Chauderon",
      "totalMusics": 2,
      "totalUpvotes": 0,
      "totalDownvotes": 1,
      "averageScore": -0.5,
      "genres": ["Jazz", "Rock"]
    }
  ]
}
```

| Champ                     | Description                                                            |
| ------------------------- | ---------------------------------------------------------------------- |
| `globalStats.totalMusics` | Nombre total de musiques en base.                                      |
| `globalStats.totalUsers`  | Nombre d'utilisateurs inscrits.                                        |
| `zoneId` / `zoneName`     | Identifiant et nom de la zone.                                         |
| `totalMusics`             | Nombre de musiques déposées dans la zone.                              |
| `totalUpvotes` / `totalDownvotes` | Somme des votes positifs / négatifs des musiques de la zone.   |
| `averageScore`            | Score moyen (`upvotes - downvotes`) des musiques, arrondi à 2 décimales. |
| `genres`                  | Liste des genres présents dans la zone (sans doublons, ordre non garanti). |

Les zones sont triées par nombre de musiques décroissant. Une zone sans musique n'apparaît pas. Si une zone a été supprimée alors que des musiques y sont encore rattachées, l'entrée est conservée mais `zoneName` est absent.

**Erreurs :** aucune erreur spécifique (`500` uniquement en cas de problème serveur).
