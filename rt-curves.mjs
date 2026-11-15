/* BASIC RT PRO 3.8 BETA — USER WAYGATE SOFTWARE COMPARISON, NOT APPROVED FOR EXPOSURES */
export const curves = {
  "version": "2026.11.14-waygate-se75-ir192-D4D5D7-v3.8-beta",
  "restriction": "Waygate-softwarevergelijking: Se75 D4 1–40 mm, D5/D7 4–30 mm; Ir192 D4 4–100 mm, D5/D7 20–50 mm; film-specifieke D 1,4/1,5–3,9. Afstand/Ci fysisch geschaald; geen praktijkvalidatie. D2/D3/D8 verwijderd uit gammacalculator.",
  "gamma": {
    "Se-75": {
      "datasetId": "waygate-se75-D4-D5-D7-20261114-v3.8-beta",
      "sourceTitle": "Waygate/AGFA Radiographic Film Systems — exposure diagrams printed p16",
      "sourceUrl": "https://dam.bakerhughes.com/m/15e84aab13c9d73d/original/Radiographic-Film-Systems-Brochure_EN_LR.pdf",
      "sourceLocal": "AGFA Structurix films.pdf, page 9",
      "status": "Waygate software comparison; not practice validated",
      "material": "Fe",
      "screens": "Pb",
      "density": 2.0,
      "referenceDistanceMm": 1000,
      "unit": "Ci·h",
      "minThicknessMm": 1,
      "maxThicknessMm": 40,
      "curves": {
        "D4": [
          {
            "mm": 1,
            "ci_h": 8.26388888888889
          },
          {
            "mm": 2,
            "ci_h": 8.836805555555555
          },
          {
            "mm": 4,
            "ci_h": 10.104166666666666
          },
          {
            "mm": 5,
            "ci_h": 10.79861111111111
          },
          {
            "mm": 8,
            "ci_h": 13.194444444444445
          },
          {
            "mm": 10,
            "ci_h": 15.069444444444445
          },
          {
            "mm": 12,
            "ci_h": 17.22222222222222
          },
          {
            "mm": 15,
            "ci_h": 21.024305555555554
          },
          {
            "mm": 17,
            "ci_h": 24.02777777777778
          },
          {
            "mm": 20,
            "ci_h": 29.35763888888889
          },
          {
            "mm": 25,
            "ci_h": 40.95486111111111
          },
          {
            "mm": 30,
            "ci_h": 57.15277777777778
          },
          {
            "mm": 35,
            "ci_h": 79.75694444444444
          },
          {
            "mm": 40,
            "ci_h": 111.30208333333333
          }
        ],
        "D5": [
          {
            "mm": 4,
            "ci_h": 5.906025709558707
          },
          {
            "mm": 5,
            "ci_h": 6.31193812945965
          },
          {
            "mm": 8,
            "ci_h": 7.712335978117901
          },
          {
            "mm": 10,
            "ci_h": 8.808299511850445
          },
          {
            "mm": 12,
            "ci_h": 10.066628013543363
          },
          {
            "mm": 15,
            "ci_h": 12.288998512501022
          },
          {
            "mm": 17,
            "ci_h": 14.044569728572597
          },
          {
            "mm": 20,
            "ci_h": 17.159947551312328
          },
          {
            "mm": 25,
            "ci_h": 23.93868496365806
          },
          {
            "mm": 30,
            "ci_h": 33.406592157847534
          }
        ],
        "D7": [
          {
            "mm": 4,
            "ci_h": 4.312490998376938
          },
          {
            "mm": 5,
            "ci_h": 4.608882132286006
          },
          {
            "mm": 8,
            "ci_h": 5.63143154427229
          },
          {
            "mm": 10,
            "ci_h": 6.431687605826774
          },
          {
            "mm": 12,
            "ci_h": 7.350500120944884
          },
          {
            "mm": 15,
            "ci_h": 8.97324157909703
          },
          {
            "mm": 17,
            "ci_h": 10.25513323325375
          },
          {
            "mm": 20,
            "ci_h": 12.529935186005845
          },
          {
            "mm": 25,
            "ci_h": 17.479667122287278
          },
          {
            "mm": 30,
            "ci_h": 24.39299032071629
          }
        ]
      },
      "waygateModel": {
        "datasetId": "waygate-se75-D4-D5-D7-20261114-v3.8-beta",
        "sourceTitle": "Gebruiker verstrekte Waygate-software-uitkomsten, 14-11-2026; geen fysische kalibratie",
        "sourceKind": "user_supplied_software_outputs",
        "status": "RESEARCH_ONLY_NOT_APPROVED_FOR_RT_EXPOSURES",
        "referenceActivityCi": 40,
        "referenceDistanceMm": 800,
        "referenceDensity": 2.0,
        "referenceCiHoursDistanceMm": 1000,
        "baseFilm": "D4",
        "d4Points": [
          {
            "mm": 1,
            "secondsAt40Ci800mm": 476,
            "ci_h": 8.26388888888889
          },
          {
            "mm": 2,
            "secondsAt40Ci800mm": 509,
            "ci_h": 8.836805555555555
          },
          {
            "mm": 4,
            "secondsAt40Ci800mm": 582,
            "ci_h": 10.104166666666666
          },
          {
            "mm": 5,
            "secondsAt40Ci800mm": 622,
            "ci_h": 10.79861111111111
          },
          {
            "mm": 8,
            "secondsAt40Ci800mm": 760,
            "ci_h": 13.194444444444445
          },
          {
            "mm": 10,
            "secondsAt40Ci800mm": 868,
            "ci_h": 15.069444444444445
          },
          {
            "mm": 12,
            "secondsAt40Ci800mm": 992,
            "ci_h": 17.22222222222222
          },
          {
            "mm": 15,
            "secondsAt40Ci800mm": 1211,
            "ci_h": 21.024305555555554
          },
          {
            "mm": 17,
            "secondsAt40Ci800mm": 1384,
            "ci_h": 24.02777777777778
          },
          {
            "mm": 20,
            "secondsAt40Ci800mm": 1691,
            "ci_h": 29.35763888888889
          },
          {
            "mm": 25,
            "secondsAt40Ci800mm": 2359,
            "ci_h": 40.95486111111111
          },
          {
            "mm": 30,
            "secondsAt40Ci800mm": 3292,
            "ci_h": 57.15277777777778
          },
          {
            "mm": 35,
            "secondsAt40Ci800mm": 4594,
            "ci_h": 79.75694444444444
          },
          {
            "mm": 40,
            "secondsAt40Ci800mm": 6411,
            "ci_h": 111.30208333333333
          }
        ],
        "films": {
          "D4": {
            "factorRelativeD4": 1.0,
            "minThicknessMm": 1.0,
            "maxThicknessMm": 40.0,
            "minDensity": 1.4,
            "maxDensity": 3.9,
            "densitySlope": 0.6495,
            "status": "waygate_software_comparison_only"
          },
          "D5": {
            "factorRelativeD4": 0.5845138846573567,
            "minThicknessMm": 4.0,
            "maxThicknessMm": 30.0,
            "minDensity": 1.5,
            "maxDensity": 3.9,
            "densitySlope": 0.6542,
            "status": "waygate_software_comparison_only"
          },
          "D7": {
            "factorRelativeD4": 0.4268032328290578,
            "minThicknessMm": 4.0,
            "maxThicknessMm": 30.0,
            "minDensity": 1.5,
            "maxDensity": 3.9,
            "densitySlope": 0.69318,
            "status": "waygate_software_comparison_only"
          }
        },
        "unresolved": "15 Ci: Waygate 38:15 instead of 1/Ci prediction 38:35; do not fit activity correction",
        "method": "log_linear_interpolation_D4; empirical_film_factor_and_linear_density_by_film; inverse_activity_square_distance"
      }
    },
    "Ir-192": {
      "datasetId": "waygate-ir192-D4-D5-D7-20261114-v3.8-beta",
      "sourceTitle": "Waygate/AGFA Radiographic Film Systems — exposure diagrams printed p16",
      "sourceUrl": "https://dam.bakerhughes.com/m/15e84aab13c9d73d/original/Radiographic-Film-Systems-Brochure_EN_LR.pdf",
      "sourceLocal": "AGFA Structurix films.pdf, page 9",
      "status": "Waygate software comparison; not practice validated",
      "material": "Fe",
      "screens": "Pb",
      "density": 2.0,
      "referenceDistanceMm": 1000,
      "unit": "Ci·h",
      "minThicknessMm": 4,
      "maxThicknessMm": 100,
      "curves": {
        "D4": [
          {
            "mm": 4,
            "ci_h": 5.416666666666667
          },
          {
            "mm": 5,
            "ci_h": 5.677083333333333
          },
          {
            "mm": 10,
            "ci_h": 7.204861111111111
          },
          {
            "mm": 15,
            "ci_h": 9.131944444444445
          },
          {
            "mm": 20,
            "ci_h": 11.57986111111111
          },
          {
            "mm": 25,
            "ci_h": 14.6875
          },
          {
            "mm": 30,
            "ci_h": 18.62847222222222
          },
          {
            "mm": 40,
            "ci_h": 29.930555555555554
          },
          {
            "mm": 50,
            "ci_h": 48.125
          },
          {
            "mm": 60,
            "ci_h": 77.36111111111111
          },
          {
            "mm": 70,
            "ci_h": 124.54861111111111
          },
          {
            "mm": 80,
            "ci_h": 199.93055555555554
          },
          {
            "mm": 90,
            "ci_h": 321.38888888888886
          },
          {
            "mm": 100,
            "ci_h": 516.6145833333334
          }
        ],
        "D5": [
          {
            "mm": 20,
            "ci_h": 7.428944097222222
          },
          {
            "mm": 25,
            "ci_h": 9.42261875
          },
          {
            "mm": 30,
            "ci_h": 11.950910069444443
          },
          {
            "mm": 40,
            "ci_h": 19.20164861111111
          },
          {
            "mm": 50,
            "ci_h": 30.8741125
          }
        ],
        "D7": [
          {
            "mm": 20,
            "ci_h": 4.743690104166666
          },
          {
            "mm": 25,
            "ci_h": 6.016734375
          },
          {
            "mm": 30,
            "ci_h": 7.631153645833333
          },
          {
            "mm": 40,
            "ci_h": 12.261052083333333
          },
          {
            "mm": 50,
            "ci_h": 19.71440625
          }
        ]
      },
      "waygateModel": {
        "datasetId": "waygate-ir192-D4-D5-D7-20261114-v3.8-beta",
        "sourceTitle": "Gebruiker verstrekte Waygate-software-uitkomsten, 14-11-2026; geen fysische kalibratie",
        "sourceKind": "user_supplied_software_outputs",
        "status": "RESEARCH_ONLY_NOT_APPROVED_FOR_RT_EXPOSURES",
        "referenceActivityCi": 40,
        "referenceDistanceMm": 800,
        "referenceDensity": 2.0,
        "referenceCiHoursDistanceMm": 1000,
        "baseFilm": "D4",
        "d4Points": [
          {
            "mm": 4,
            "secondsAt40Ci800mm": 312,
            "ci_h": 5.416666666666667
          },
          {
            "mm": 5,
            "secondsAt40Ci800mm": 327,
            "ci_h": 5.677083333333333
          },
          {
            "mm": 10,
            "secondsAt40Ci800mm": 415,
            "ci_h": 7.204861111111111
          },
          {
            "mm": 15,
            "secondsAt40Ci800mm": 526,
            "ci_h": 9.131944444444445
          },
          {
            "mm": 20,
            "secondsAt40Ci800mm": 667,
            "ci_h": 11.57986111111111
          },
          {
            "mm": 25,
            "secondsAt40Ci800mm": 846,
            "ci_h": 14.6875
          },
          {
            "mm": 30,
            "secondsAt40Ci800mm": 1073,
            "ci_h": 18.62847222222222
          },
          {
            "mm": 40,
            "secondsAt40Ci800mm": 1724,
            "ci_h": 29.930555555555554
          },
          {
            "mm": 50,
            "secondsAt40Ci800mm": 2772,
            "ci_h": 48.125
          },
          {
            "mm": 60,
            "secondsAt40Ci800mm": 4456,
            "ci_h": 77.36111111111111
          },
          {
            "mm": 70,
            "secondsAt40Ci800mm": 7174,
            "ci_h": 124.54861111111111
          },
          {
            "mm": 80,
            "secondsAt40Ci800mm": 11516,
            "ci_h": 199.93055555555554
          },
          {
            "mm": 90,
            "secondsAt40Ci800mm": 18512,
            "ci_h": 321.38888888888886
          },
          {
            "mm": 100,
            "secondsAt40Ci800mm": 29757,
            "ci_h": 516.6145833333334
          }
        ],
        "films": {
          "D4": {
            "factorRelativeD4": 1.0,
            "minThicknessMm": 4.0,
            "maxThicknessMm": 100.0,
            "minDensity": 1.5,
            "maxDensity": 3.9,
            "densitySlope": 0.64985,
            "status": "waygate_software_comparison_only"
          },
          "D5": {
            "factorRelativeD4": 0.64154,
            "minThicknessMm": 20.0,
            "maxThicknessMm": 50.0,
            "minDensity": 1.5,
            "maxDensity": 3.9,
            "densitySlope": 0.653,
            "status": "waygate_software_comparison_only"
          },
          "D7": {
            "factorRelativeD4": 0.40965,
            "minThicknessMm": 20.0,
            "maxThicknessMm": 50.0,
            "minDensity": 1.5,
            "maxDensity": 3.9,
            "densitySlope": 0.6939,
            "status": "waygate_software_comparison_only"
          }
        },
        "unresolved": "D5/D7 only checked at 20 and 50 mm; density curves checked at 20 mm only",
        "method": "log_linear_interpolation_D4; empirical_film_factor_and_linear_density_by_film; inverse_activity_square_distance"
      }
    }
  },
  "xray": {
    "Andrex SMART 225": {
      "datasetId": "andrex-smart225-vector-20261112-unvalidated",
      "sourceTitle": "ANDREX SMART 225 — supplied original exposure chart",
      "sourceLocal": "Belichtingsgrafiek SMART 225b.pdf, page 1",
      "status": "vector_digitized_unverified",
      "material": "Fe",
      "screens": "Pb 0.027 mm",
      "film": "D5",
      "density": 2.5,
      "referenceDistanceMm": 800,
      "unit": "mA·min",
      "curves": [
        {
          "kv": 100,
          "film": "D5",
          "density": 2.5,
          "referenceDistanceMm": 800,
          "minThicknessMm": 0.02848,
          "maxThicknessMm": 9.24242,
          "log10MamPerMm": 0.1675137444,
          "log10MamIntercept": 0.2579468814,
          "minMam": 1,
          "maxMam": 64
        },
        {
          "kv": 120,
          "film": "D5",
          "density": 2.5,
          "referenceDistanceMm": 800,
          "minThicknessMm": 0.0,
          "maxThicknessMm": 14.0404,
          "log10MamPerMm": 0.1116155041,
          "log10MamIntercept": 0.2390531996,
          "minMam": 1,
          "maxMam": 64
        },
        {
          "kv": 140,
          "film": "D5",
          "density": 2.5,
          "referenceDistanceMm": 800,
          "minThicknessMm": 1.07276,
          "maxThicknessMm": 18.0303,
          "log10MamPerMm": 0.1062080261,
          "log10MamIntercept": -0.1132098323,
          "minMam": 1,
          "maxMam": 64
        },
        {
          "kv": 160,
          "film": "D5",
          "density": 2.5,
          "referenceDistanceMm": 800,
          "minThicknessMm": 3.28283,
          "maxThicknessMm": 22.57576,
          "log10MamPerMm": 0.0931598371,
          "log10MamIntercept": -0.3058277481,
          "minMam": 1,
          "maxMam": 64
        },
        {
          "kv": 180,
          "film": "D5",
          "density": 2.5,
          "referenceDistanceMm": 800,
          "minThicknessMm": 5.40404,
          "maxThicknessMm": 26.41414,
          "log10MamPerMm": 0.0857565159,
          "log10MamIntercept": -0.4634316771,
          "minMam": 1,
          "maxMam": 64
        },
        {
          "kv": 200,
          "film": "D5",
          "density": 2.5,
          "referenceDistanceMm": 800,
          "minThicknessMm": 7.27273,
          "maxThicknessMm": 29.79798,
          "log10MamPerMm": 0.0801846715,
          "log10MamIntercept": -0.5831612472,
          "minMam": 1,
          "maxMam": 64
        },
        {
          "kv": 210,
          "film": "D5",
          "density": 2.5,
          "referenceDistanceMm": 800,
          "minThicknessMm": 8.33333,
          "maxThicknessMm": 32.27273,
          "log10MamPerMm": 0.0756329459,
          "log10MamIntercept": -0.6302745488,
          "minMam": 1,
          "maxMam": 64
        },
        {
          "kv": 225,
          "film": "D5",
          "density": 2.5,
          "referenceDistanceMm": 800,
          "minThicknessMm": 8.96946,
          "maxThicknessMm": 40.0,
          "log10MamPerMm": 0.0577551237,
          "log10MamIntercept": -0.5173057101,
          "minMam": 1,
          "maxMam": 64
        }
      ]
    }
  }
};
