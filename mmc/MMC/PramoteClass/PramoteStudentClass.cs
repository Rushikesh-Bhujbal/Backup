using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Client;
using System.ServiceModel;
using Microsoft.Crm.Sdk.Messages;


namespace PramoteClass
{
    public class PramoteStudentClass : IPlugin
    {

        public void Execute(IServiceProvider serviceProvider)
        {
            IPluginExecutionContext context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            IOrganizationServiceFactory serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            IOrganizationService _service = serviceFactory.CreateOrganizationService(context.UserId);
            
            try
            {

                if (context.MessageName == "Update")
                {
                    if (context.InputParameters.Contains("Target") && context.InputParameters["Target"] is Entity)
                    {
                        Entity studentPreImage = context.PreEntityImages["PrePromotionImage"];
                        Entity entity = context.InputParameters["Target"] as Entity;
                        var oldClass = 0;
                        var newClass = 0;
                        
                        if (studentPreImage.Contains("new_promotionclass"))
                        {

                            oldClass = ((Microsoft.Xrm.Sdk.OptionSetValue)studentPreImage["new_promotionclass"]).Value;
                            newClass = (((Microsoft.Xrm.Sdk.OptionSetValue)entity["new_promotionclass"]).Value);
                            if (oldClass != newClass)
                            {
                                Entity studentclasspromotion = new Entity("new_studentclasspromotion");
                                studentclasspromotion.Attributes["new_newclassvalue"] = new OptionSetValue(newClass);
                                studentclasspromotion.Attributes["new_oldclassvalue"] = new OptionSetValue(oldClass);
                                studentclasspromotion.Attributes["new_studentcode"] = new EntityReference(entity.LogicalName, entity.Id);
                                _service.Create(studentclasspromotion);
                            }
                            
                        }

                    }
                }
            }
            catch (Exception ex)
            {
                throw new InvalidPluginExecutionException(ex.ToString());
            }
        }
    }
}
