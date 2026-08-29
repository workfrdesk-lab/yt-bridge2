import { exec } from "child_process";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { videoUrl, quality } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl is required." },
        { status: 400 }
      );
    }

    console.log("Requête reçue pour la vidéo :", videoUrl);
    console.log("Qualité demandée :", quality || "best");

    // Commande yt-dlp pour obtenir la liste des formats disponibles
    const listFormatsCommand = `yt-dlp -F "${videoUrl}"`;

    return new Promise((resolve) => {
      exec(listFormatsCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("Erreur yt-dlp lors de la récupération des formats disponibles :", error.message);
          console.error("Détails stderr :", stderr);
          return resolve(
            NextResponse.json(
              { error: "Failed to fetch video formats." },
              { status: 500 }
            )
          );
        }

        const formatsList = stdout;

        // Vérifie si le format demandé est dans la liste des formats disponibles
        const formatAvailable = formatsList.includes(quality || "best");

        if (!formatAvailable) {
          return resolve(
            NextResponse.json(
              {
                error: `Le format demandé (${quality}) n'est pas disponible.`,
                availableFormats: formatsList,
              },
              { status: 400 }
            )
          );
        }

        // Si le format est disponible, continuer avec le téléchargement
        const command = `yt-dlp -f "best" --get-url "${videoUrl}"`;

        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error("Erreur yt-dlp lors du téléchargement de la vidéo :", error.message);
            console.error("Détails stderr :", stderr);
            resolve(
              NextResponse.json(
                { error: "Failed to fetch video information." },
                { status: 500 }
              )
            );
            return;
          }

          if (stderr) {
            console.error("Problème yt-dlp (stderr) :", stderr);
          }

          const downloadUrl = stdout.trim();

          console.log("URL de téléchargement générée :", downloadUrl);

          // Retourne le lien de téléchargement dans la réponse JSON
          return resolve(
            NextResponse.json({ downloadLink: downloadUrl }, { status: 200 })
          );
        });
      });
    });
  } catch (error) {
    console.error("Erreur serveur :", error.message);
    return NextResponse.json(
      { error: "Failed to process the request." },
      { status: 500 }
    );
  }
}