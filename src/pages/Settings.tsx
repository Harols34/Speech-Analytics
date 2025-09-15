
import React from "react";
import Layout from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileSection from "@/components/settings/ProfileSection";
import PasswordSection from "@/components/settings/PasswordSection";
import AudioSettings from "@/components/settings/AudioSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UserSettings from "@/components/settings/UserSettings";

export default function Settings() {
  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Administra tu perfil, configuraciones de audio y preferencias.
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="password">Contraseña</TabsTrigger>
            <TabsTrigger value="user-settings">API & Modelos</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Información del Perfil</CardTitle>
                <CardDescription>
                  Actualiza tu información personal y preferencias.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>
                  Actualiza tu contraseña para mantener tu cuenta segura.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PasswordSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user-settings">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de API y Modelos</CardTitle>
                <CardDescription>
                  Configura tu clave de OpenAI y preferencias de modelos de IA.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audio">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Audio</CardTitle>
                <CardDescription>
                  Configura las opciones de transcripción y análisis de audio.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AudioSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Notificaciones</CardTitle>
                <CardDescription>
                  Administra cómo y cuándo recibes notificaciones.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
