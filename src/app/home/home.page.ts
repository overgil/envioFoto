import { Component } from '@angular/core';
import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/Camera/ngx';
import { ActionSheetController, ToastController, Platform, LoadingController } from '@ionic/angular';
import { File, FileEntry } from '@ionic-native/File/ngx';
import { HttpClient } from '@angular/common/http';
import { FilePath } from '@ionic-native/file-path/ngx';

import { finalize } from 'rxjs/operators';
import {catchError} from 'rxjs/operators';
import {throwError} from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  images = [];
  nomeImagem:  any;
  localImagem: any;
  actionSheet: any;
  locImagem:   any;
  locNameImg:  string;
  lc:any;

  public myPhoto: any;
  public error: string;
  private loading: any;


  constructor(
      private camera: Camera,
      private file: File,
      private http: HttpClient,
      private actionSheetController: ActionSheetController,
      private toastController: ToastController,
      private platform: Platform,
      private loadingController: LoadingController,
      private filePath: FilePath) { }


  async selectImage() {

    this.actionSheet = await this.actionSheetController.create({
      header: 'Imagem do Perfil',
      buttons: [{
        text: 'Camera',
        role: 'destructive',
        icon: 'thumbs-up',
        handler: () => {
          this.takePhoto();
          // this.takePicture(this.camera.PictureSourceType.CAMERA);
        }
      }, {
        text: 'Arquivo',
        role: 'destructive',
        icon: 'trash',
        handler: () => {
          this.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY);
        }
      }]
    });
    await this.actionSheet.present();
  }

  takePicture(sourceType: PictureSourceType) {
    const options: CameraOptions = {
      quality: 100,
      sourceType: sourceType,
      saveToPhotoAlbum: false,
      correctOrientation: true,
    };

    this.camera.getPicture(options).then(imagePath => {
      if (this.platform.is('android') && sourceType === this.camera.PictureSourceType.PHOTOLIBRARY) {
        this.filePath.resolveNativePath(imagePath)
            .then(filePath => {
              const correctPath = filePath.substr(0, filePath.lastIndexOf('/') + 1);
              const currentName = imagePath.substring(imagePath.lastIndexOf('/') + 1, imagePath.lastIndexOf('?'));
              this.localImagem  = correctPath + currentName;
              // this.copyFileToLocalDir(correctPath, currentName, this.createFileName());
            });
      } else {
        const currentName = imagePath.substr(imagePath.lastIndexOf('/') + 1);
        const correctPath = imagePath.substr(0, imagePath.lastIndexOf('/') + 1);

        const localImgs  = correctPath + currentName;
        // this.localImagem = this.pathForImage(localImgs);

        this.locImagem   = correctPath;
        this.locNameImg  = currentName;

        this.copyFileToLocalDir(correctPath, currentName, this.createFileName());
      }
    }); // */

  }

  createFileName() {
    let d = new Date(),
        n = d.getTime(),
        newFileName = n + '.jpg';
    return newFileName;
  }

  copyFileToLocalDir(namePath, currentName, newFileName) {
    this.file.copyFile(namePath, currentName, this.file.dataDirectory, newFileName).then(success => {
      console.log('linha 148 Arquivo copiado ' + JSON.stringify(success));
      this.lc = success.nativeURL;
      console.log('150 url formada: ' + this.lc);
    }, error => {
      console.log('Erro ao copiar o arquivo: ' + JSON.stringify(error));
    });

  }

  private convertFileSrc(url: string): string {
    if (!url) {
      return url;
    }
    if (!url.startsWith('file://')) {
      return url;
    }
    url = url.substr(7);
    if (url.length === 0 || url[0] !== '/') {
      url = '/' + url;
    }
    return window['WEBVIEW_SERVER_URL'] + '/_file_' + url;
  }

  private async uploadPhoto(imageFileUri: any) {
    this.error = null;
    this.loading = await this.loadingController.create({
      message: 'Uploading...'
    });

    this.loading.present();
    window['resolveLocalFileSystemURL'](imageFileUri,
        entry => {
          entry['file'](file => this.readFile(file));
        });
  }


  private readFile(file: any) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const formData = new FormData();
      const imgBlob = new Blob([reader.result], {type: file.type});
      formData.append('file', imgBlob, file.name);
      this.postData(formData);
    };
    reader.readAsArrayBuffer(file);
  }

  takePhoto() {
    const camera: any = navigator['camera'];
    camera.getPicture(imageData => {
      this.myPhoto = this.convertFileSrc(imageData);
      this.uploadPhoto(imageData);
    }, error => this.error = JSON.stringify(error), {
      quality: 100,
      destinationType: camera.DestinationType.FILE_URI,
      sourceType: camera.PictureSourceType.CAMERA,
      encodingType: camera.EncodingType.JPEG
    });
  }

  private postData(formData: FormData) {
    console.log(JSON.stringify(formData));
    this.http.post<boolean>('http://10.0.2.2:8000/api/upload', formData)
        .pipe(
            catchError(e => this.handleError(e)),
            finalize(() => this.loading.dismiss())
        )
        .subscribe(ok => this.showToast(ok));
  }

  private async showToast(ok: boolean | {}) {
    if (ok === true) {
      const toast = await this.toastController.create({
        message: 'Upload successful',
        duration: 3000,
        position: 'top'
      });
      toast.present();
    } else {
      const toast = await this.toastController.create({
        message: 'Upload failed',
        duration: 3000,
        position: 'top'
      });
      toast.present();
    }
  }

  private handleError(error: any) {
    const errMsg = error.message ? error.message : error.toString();
    this.error = errMsg;
    return throwError(errMsg);
  }

}
